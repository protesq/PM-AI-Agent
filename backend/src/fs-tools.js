const fs   = require("fs");
const path = require("path");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

function makeResult(data) {
  return { success: true, data, error: null, timestamp: new Date().toISOString() };
}
function makeError(msg) {
  return { success: false, data: null, error: String(msg), timestamp: new Date().toISOString() };
}

// Basit path traversal koruması
function safePath(p) {
  if (!p || typeof p !== "string") return null;
  const normalized = path.normalize(p).replace(/\\/g, "/");
  return normalized;
}

// ── Dosya yaz (klasörler yoksa oluşturur) ────────────────────────────────────
async function createFile(filePath, content) {
  try {
    const safe = safePath(filePath);
    if (!safe) return makeError("Geçersiz dosya yolu");
    fs.mkdirSync(path.dirname(safe), { recursive: true });
    fs.writeFileSync(safe, content || "", "utf8");
    return makeResult({ path: safe, size: Buffer.byteLength(content || "", "utf8") });
  } catch (err) {
    return makeError(err.message);
  }
}

// ── Dosya oku ────────────────────────────────────────────────────────────────
async function readFile(filePath) {
  try {
    const safe = safePath(filePath);
    if (!safe) return makeError("Geçersiz dosya yolu");
    if (!fs.existsSync(safe)) return makeError(`Dosya bulunamadı: ${safe}`);
    const content = fs.readFileSync(safe, "utf8");
    return makeResult({ path: safe, content, lines: content.split("\n").length });
  } catch (err) {
    return makeError(err.message);
  }
}

// ── Klasör listele ───────────────────────────────────────────────────────────
async function listDirectory(dirPath) {
  try {
    const safe = safePath(dirPath);
    if (!safe) return makeError("Geçersiz klasör yolu");
    if (!fs.existsSync(safe)) return makeError(`Klasör bulunamadı: ${safe}`);
    const items = fs.readdirSync(safe, { withFileTypes: true }).map((d) => ({
      name: d.name,
      type: d.isDirectory() ? "directory" : "file",
      path: path.join(safe, d.name).replace(/\\/g, "/"),
    }));
    return makeResult({ path: safe, count: items.length, items });
  } catch (err) {
    return makeError(err.message);
  }
}

// ── Klasör oluştur ───────────────────────────────────────────────────────────
async function createDirectory(dirPath) {
  try {
    const safe = safePath(dirPath);
    if (!safe) return makeError("Geçersiz klasör yolu");
    fs.mkdirSync(safe, { recursive: true });
    return makeResult({ path: safe });
  } catch (err) {
    return makeError(err.message);
  }
}

// ── Dosya sil ────────────────────────────────────────────────────────────────
async function deleteFile(filePath) {
  try {
    const safe = safePath(filePath);
    if (!safe) return makeError("Geçersiz dosya yolu");
    if (!fs.existsSync(safe)) return makeError(`Dosya bulunamadı: ${safe}`);
    const stat = fs.statSync(safe);
    if (stat.isDirectory()) {
      fs.rmSync(safe, { recursive: true, force: true });
    } else {
      fs.unlinkSync(safe);
    }
    return makeResult({ deleted: safe });
  } catch (err) {
    return makeError(err.message);
  }
}

// ── Terminal komutu çalıştır ──────────────────────────────────────────────────
// Whitelist: güvenli komutlar
const ALLOWED_COMMANDS = [
  /^npm\s/,
  /^npx\s/,
  /^node\s/,
  /^git\s/,
  /^docker\s/,
  /^python\s/,
  /^pip\s/,
  /^yarn\s/,
  /^pnpm\s/,
  /^ls(\s|$)/,
  /^dir(\s|$)/,
  /^mkdir\s/,
  /^touch\s/,
  /^cat\s/,
  /^echo\s/,
  /^type\s/,
];

async function runCommand(workDir, command) {
  try {
    if (!command || typeof command !== "string") return makeError("Komut boş");

    const isAllowed = ALLOWED_COMMANDS.some((r) => r.test(command.trim()));
    if (!isAllowed) {
      return makeError(`Güvenlik: bu komut izin verilenler listesinde yok: "${command}"`);
    }

    const cwd = workDir ? safePath(workDir) : process.cwd();
    if (workDir && !fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }

    console.log(`[FS] RUN: ${command} (cwd: ${cwd})`);
    const { stdout, stderr } = await execAsync(command, { cwd, timeout: 120000 });
    return makeResult({
      command,
      cwd,
      stdout: (stdout || "").trim(),
      stderr: (stderr || "").trim(),
    });
  } catch (err) {
    return makeError(err.stderr?.trim() || err.message);
  }
}

module.exports = { createFile, readFile, listDirectory, createDirectory, deleteFile, runCommand };
