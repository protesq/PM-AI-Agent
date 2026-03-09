const express = require("express");
const router = express.Router();
const { query } = require("../db");
const docker = require("../docker-tools");
const { generateReport } = require("../tools");

// GET /api/projects
router.get("/", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM projects ORDER BY created_at DESC");
    res.json({ success: true, data: rows, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// POST /api/projects
router.post("/", async (req, res) => {
  const { name, description, path: projectPath, autoStart } = req.body;
  if (!name) return res.status(400).json({ success: false, data: null, error: "name is required" });
  try {
    const result = await query(
      "INSERT INTO projects (name, description, path) VALUES (?, ?, ?)",
      [name, description || "", projectPath || ""]
    );
    const rows = await query("SELECT * FROM projects WHERE id = ?", [result.insertId]);
    const project = rows[0];

    // autoStart=true ve path varsa docker compose up
    let dockerResult = null;
    if (autoStart && projectPath) {
      dockerResult = await docker.startProjectDocker(projectPath);
    }

    res.status(201).json({ success: true, data: project, dockerResult, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// PATCH /api/projects/:id/path
router.patch("/:id/path", async (req, res) => {
  const { path: projectPath } = req.body;
  if (typeof projectPath !== "string") return res.status(400).json({ success: false, error: "path gerekli" });
  try {
    await query("UPDATE projects SET path = ? WHERE id = ?", [projectPath.trim(), req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/docker/start  — sonradan da başlatılabilir
router.post("/:id/docker/start", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM projects WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: "Proje bulunamadı" });
    const project = rows[0];
    if (!project.path) return res.status(400).json({ success: false, error: "Projede klasör yolu yok" });
    const result = await docker.startProjectDocker(project.path);
    res.json({ success: result.success, data: result.data, error: result.error });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/docker/stop
router.post("/:id/docker/stop", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM projects WHERE id = ?", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: "Proje bulunamadı" });
    const result = await docker.stopProjectDocker(rows[0].path);
    res.json({ success: result.success, data: result.data, error: result.error });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/projects/:id/tasks
router.get("/:id/tasks", async (req, res) => {
  try {
    const rows = await query("SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC", [req.params.id]);
    res.json({ success: true, data: rows, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// POST /api/projects/:id/tasks
router.post("/:id/tasks", async (req, res) => {
  const { title, assigned_to } = req.body;
  if (!title) return res.status(400).json({ success: false, data: null, error: "title is required" });
  try {
    const result = await query(
      "INSERT INTO tasks (project_id, title, assigned_to) VALUES (?, ?, ?)",
      [req.params.id, title, assigned_to || null]
    );
    const rows = await query("SELECT * FROM tasks WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

// POST /api/projects/:id/report
router.post("/:id/report", async (req, res) => {
  try {
    const result = await generateReport(parseInt(req.params.id));
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

module.exports = router;
