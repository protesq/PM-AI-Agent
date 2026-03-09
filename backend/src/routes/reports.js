const express = require("express");
const router = express.Router();
const { query } = require("../db");

// GET /api/reports
router.get("/", async (req, res) => {
  try {
    const rows = await query(
      "SELECT r.*, p.name AS project_name FROM reports r LEFT JOIN projects p ON r.project_id = p.id ORDER BY r.created_at DESC"
    );
    res.json({ success: true, data: rows, error: null });
  } catch (err) {
    res.status(500).json({ success: false, data: null, error: err.message });
  }
});

module.exports = router;
