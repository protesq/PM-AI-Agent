const express  = require("express");
const router   = express.Router();
const fs       = require("fs");
const path     = require("path");
const { exec } = require("child_process");

const PROMPT_FILE = path.join(__dirname, "../../system-prompt.md");

// GET /api/settings/system-prompt
router.get("/system-prompt", (req, res) => {
  try {
    const content = fs.existsSync(PROMPT_FILE)
      ? fs.readFileSync(PROMPT_FILE, "utf8")
      : "";
    res.json({ success: true, data: { content }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// PUT /api/settings/system-prompt
router.put("/system-prompt", (req, res) => {
  const { content } = req.body;
  if (typeof content !== "string") {
    return res.status(400).json({ success: false, data: null, error: "content gerekli" });
  }
  try {
    fs.writeFileSync(PROMPT_FILE, content, "utf8");
    res.json({ success: true, data: { saved: true }, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// GET /api/settings/env  — Mevcut .env değerlerini oku (hassas olmayan)
router.get("/env", (req, res) => {
  res.json({
    success: true,
    data: {
      MYSQL_HOST:     process.env.MYSQL_HOST     || "",
      MYSQL_PORT:     process.env.MYSQL_PORT     || "3306",
      MYSQL_USER:     process.env.MYSQL_USER     || "",
      MYSQL_PASSWORD: process.env.MYSQL_PASSWORD || "",
      MYSQL_DATABASE: process.env.MYSQL_DATABASE || "",
      USE_SQLITE:     process.env.USE_SQLITE     || "false",
      PORT:           process.env.PORT           || "5000",
    },
  });
});

// PUT /api/settings/env  — .env dosyasını güncelle
router.put("/env", (req, res) => {
  const ENV_FILE = path.join(__dirname, "../../../.env");
  const allowed = ["MYSQL_HOST","MYSQL_PORT","MYSQL_USER","MYSQL_PASSWORD","MYSQL_DATABASE","USE_SQLITE","PORT"];
  try {
    let content = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, "utf8") : "";
    for (const key of allowed) {
      if (req.body[key] === undefined) continue;
      const val = String(req.body[key]);
      const re = new RegExp(`^${key}=.*$`, "m");
      if (re.test(content)) {
        content = content.replace(re, `${key}=${val}`);
      } else {
        content += `\n${key}=${val}`;
      }
      process.env[key] = val;
    }
    fs.writeFileSync(ENV_FILE, content, "utf8");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/settings/docker-compose
const COMPOSE_FILE_PATH = path.join(__dirname, "../../../docker-compose.yml");

router.get("/docker-compose", (req, res) => {
  try {
    const content = fs.existsSync(COMPOSE_FILE_PATH)
      ? fs.readFileSync(COMPOSE_FILE_PATH, "utf8")
      : "";
    res.json({ success: true, data: { content } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/settings/docker-compose
router.put("/docker-compose", (req, res) => {
  const { content } = req.body;
  if (typeof content !== "string") {
    return res.status(400).json({ success: false, error: "content gerekli" });
  }
  try {
    fs.writeFileSync(COMPOSE_FILE_PATH, content, "utf8");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/settings/pick-folder  — Windows klasör seçici dialog
router.get("/pick-folder", (req, res) => {
  const ps = `
Add-Type -AssemblyName System.Windows.Forms
$d = New-Object System.Windows.Forms.FolderBrowserDialog
$d.Description = 'Proje klasorunu secin'
$d.ShowNewFolderButton = $true
if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }
`.trim();

  exec(`powershell -NoProfile -Command "${ps.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`,
    { timeout: 60000 },
    (err, stdout) => {
      const selected = stdout.trim();
      if (err || !selected) return res.json({ success: false, path: null });
      res.json({ success: true, path: selected.replace(/\\/g, "/") });
    }
  );
});

// POST /api/settings/open-folder
router.post("/open-folder", (req, res) => {
  const { folderPath } = req.body;
  if (!folderPath || typeof folderPath !== "string") {
    return res.status(400).json({ success: false, error: "folderPath gerekli" });
  }
  const safe = folderPath.replace(/[;&|`$<>]/g, "").trim();
  const winPath = safe.replace(/\//g, "\\");

  // explorer.exe her zaman exit code 1 döndürür — hata sayma
  if (process.platform === "win32") {
    exec(`explorer "${winPath}"`);
    return res.json({ success: true });
  }

  const cmd = process.platform === "darwin" ? `open "${safe}"` : `xdg-open "${safe}"`;
  exec(cmd, (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true });
  });
});

module.exports = router;
