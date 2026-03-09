const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const execAsync = promisify(exec);

// Docker içinde: env var üzerinden gelir
// Lokalde: backend/src'den iki üst dizin = proje kökü
const COMPOSE_FILE =
  process.env.COMPOSE_FILE ||
  path.resolve(__dirname, "../../docker-compose.yml");

const PROJECT_NAME = process.env.COMPOSE_PROJECT_NAME || "aiagent";

// Sadece izin verilen servis isimleri (güvenlik)
const ALLOWED_SERVICES = ["frontend", "backend", "db", "phpmyadmin"];

function makeResult(data) {
  return { success: true, data, error: null, timestamp: new Date().toISOString() };
}
function makeError(msg) {
  return { success: false, data: null, error: String(msg), timestamp: new Date().toISOString() };
}

async function run(cmd, timeout = 20000) {
  try {
    const { stdout, stderr } = await execAsync(cmd, { timeout });
    return makeResult((stdout || "").trim() || (stderr || "").trim() || "(komut başarılı, çıktı yok)");
  } catch (err) {
    return makeError(err.stderr?.trim() || err.message);
  }
}

// Servis adı güvenlik kontrolü
function validateService(service) {
  if (!ALLOWED_SERVICES.includes(service)) {
    return `Geçersiz servis adı: "${service}". İzin verilenler: ${ALLOWED_SERVICES.join(", ")}`;
  }
  return null;
}

// ── Konteyner listesi ────────────────────────────────────────────────────────

async function listContainers() {
  return run(
    `docker ps -a --filter "label=com.docker.compose.project=${PROJECT_NAME}" ` +
    `--format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"`
  );
}

// ── Loglar ──────────────────────────────────────────────────────────────────

async function getServiceLogs(service_name, lines = 80) {
  const err = validateService(service_name);
  if (err) return makeError(err);
  return run(
    `docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} logs --no-color --tail=${lines} ${service_name}`,
    30000
  );
}

// ── Start / Stop / Restart ───────────────────────────────────────────────────

async function startService(service_name) {
  const err = validateService(service_name);
  if (err) return makeError(err);
  return run(`docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} start ${service_name}`);
}

async function stopService(service_name) {
  const err = validateService(service_name);
  if (err) return makeError(err);
  return run(`docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} stop ${service_name}`);
}

async function restartService(service_name) {
  const err = validateService(service_name);
  if (err) return makeError(err);
  return run(`docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} restart ${service_name}`, 60000);
}

// ── Kaynak istatistikleri ────────────────────────────────────────────────────

async function getStats() {
  const result = await run(
    `docker stats --no-stream --format "{{json .}}" ` +
    `$(docker ps -q --filter "label=com.docker.compose.project=${PROJECT_NAME}")`
  );
  if (!result.success) return result;

  // Her satır ayrı JSON objesi olarak gelir, parse edelim
  try {
    const rows = result.data
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        const r = JSON.parse(line);
        return {
          name: r.Name,
          cpu: r.CPUPerc,
          mem_usage: r.MemUsage,
          mem_pct: r.MemPerc,
          net_io: r.NetIO,
          block_io: r.BlockIO,
          pids: r.PIDs,
        };
      });
    return makeResult(rows);
  } catch {
    return result; // parse edilemezse ham metin döndür
  }
}

// ── Inspect ──────────────────────────────────────────────────────────────────

async function inspectService(service_name) {
  const err = validateService(service_name);
  if (err) return makeError(err);

  const result = await run(
    `docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} ps --format json ${service_name}`
  );
  if (!result.success) return result;

  try {
    // docker compose ps --format json çoklu satır döndürebilir
    const rows = result.data
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    return makeResult(rows);
  } catch {
    return result;
  }
}

// ── Servis yeniden oluştur (pull + up) ──────────────────────────────────────

async function rebuildService(service_name) {
  const err = validateService(service_name);
  if (err) return makeError(err);
  return run(
    `docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} up -d --build ${service_name}`,
    120000
  );
}

// ── Proje klasöründe docker compose up/down ──────────────────────────────────

function validatePath(p) {
  if (!p || typeof p !== "string" || !p.trim()) return "Klasör yolu boş";
  // Basit path traversal koruması
  if (p.includes("..")) return "Geçersiz klasör yolu";
  return null;
}

async function startProjectDocker(projectPath) {
  const err = validatePath(projectPath);
  if (err) return makeError(err);
  const normalized = projectPath.trim().replace(/\\/g, "/");
  // docker-compose.yml veya compose.yaml'ı dene
  const result = await run(`docker compose -f "${normalized}/docker-compose.yml" up -d`, 120000);
  if (!result.success) {
    return run(`docker compose -f "${normalized}/compose.yaml" up -d`, 120000);
  }
  return result;
}

async function stopProjectDocker(projectPath) {
  const err = validatePath(projectPath);
  if (err) return makeError(err);
  const normalized = projectPath.trim().replace(/\\/g, "/");
  const result = await run(`docker compose -f "${normalized}/docker-compose.yml" down`, 60000);
  if (!result.success) {
    return run(`docker compose -f "${normalized}/compose.yaml" down`, 60000);
  }
  return result;
}

// ── Durum özeti ──────────────────────────────────────────────────────────────

async function getComposeStatus() {
  return run(
    `docker compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} ps --format "table {{.Name}}\t{{.Status}}\t{{.Service}}\t{{.Ports}}"`
  );
}

module.exports = {
  listContainers,
  getServiceLogs,
  startService,
  stopService,
  startProjectDocker,
  stopProjectDocker,
  restartService,
  getStats,
  inspectService,
  rebuildService,
  getComposeStatus,
};
