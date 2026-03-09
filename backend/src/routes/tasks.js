const express = require("express");
const router = express.Router();
const { query } = require("../db");

// PATCH /api/tasks/:id/status
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["todo", "in_progress", "done"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, data: null, error: `status must be one of: ${validStatuses.join(", ")}` });
  }
  try {
    await query("UPDATE tasks SET status = ? WHERE id = ?", [status, req.params.id]);
    const rows = await query("SELECT * FROM tasks WHERE id = ?", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ success: false, data: null, error: "Task not found" });
    res.json({ success: true, data: rows[0], error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

module.exports = router;
