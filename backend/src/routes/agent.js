const express = require("express");
const router = express.Router();
const { runAgentLoop } = require("../agent");

router.post("/request", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      data: null,
      error: "message field is required",
      steps: [],
    });
  }

  try {
    const result = await runAgentLoop(message.trim());
    return res.json({
      success: true,
      data: { response: result.response, report: result.report },
      error: null,
      steps: result.steps,
    });
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("[ROUTE /agent/request] Error:", msg);
    return res.status(500).json({
      success: false,
      data: null,
      error: msg,
      steps: [{ step: "agent_called", status: "error", timestamp: new Date().toISOString(), detail: msg }],
    });
  }
});

module.exports = router;
