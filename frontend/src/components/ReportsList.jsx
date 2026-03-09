import React, { useState } from "react";

export default function ReportsList({ reports, onRefresh }) {
  const [expanded, setExpanded] = useState({});

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const parseContent = (content) => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div
        style={{
          padding: "12px 14px",
          borderBottom: "1px solid #1e293b",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0a0a0f",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>📋 Reports ({reports.length})</span>
        <button
          onClick={onRefresh}
          style={{
            background: "none",
            border: "1px solid #334155",
            color: "#94a3b8",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: "pointer",
            fontSize: 11,
          }}
        >
          ↻
        </button>
      </div>

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
        {reports.length === 0 && (
          <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: 16 }}>
            No reports yet. Ask the agent to generate one!
          </div>
        )}
        {reports.map((r) => {
          const parsed = parseContent(r.content);
          return (
            <div key={r.id} style={{ margin: "2px 8px" }}>
              <div
                onClick={() => toggle(r.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                  background: expanded[r.id] ? "#1e293b" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <span style={{ color: "#f59e0b", fontSize: 11 }}>📄</span>
                <span style={{ flex: 1, fontSize: 12, color: "#e2e8f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.project_name || `Project #${r.project_id}`}
                </span>
                <span style={{ fontSize: 10, color: "#475569" }}>{expanded[r.id] ? "▲" : "▼"}</span>
              </div>

              {expanded[r.id] && parsed && (
                <div style={{ paddingLeft: 10, paddingRight: 10, paddingBottom: 8 }}>
                  <div
                    style={{
                      background: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: 6,
                      padding: "8px 10px",
                      fontSize: 11,
                      color: "#94a3b8",
                    }}
                  >
                    <div style={{ marginBottom: 6, color: "#e2e8f0", fontWeight: 600 }}>
                      {parsed.project?.name}
                    </div>
                    <div style={{ display: "flex", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span>Total: <b style={{ color: "#e2e8f0" }}>{parsed.summary?.total_tasks}</b></span>
                      <span style={{ color: "#00ff88" }}>Done: <b>{parsed.summary?.done}</b></span>
                      <span style={{ color: "#f59e0b" }}>In Progress: <b>{parsed.summary?.in_progress}</b></span>
                      <span style={{ color: "#94a3b8" }}>Todo: <b>{parsed.summary?.todo}</b></span>
                    </div>
                    {parsed.tasks?.map((t) => (
                      <div key={t.id} style={{ display: "flex", gap: 6, marginBottom: 2, alignItems: "center" }}>
                        <span style={{ color: t.status === "done" ? "#00ff88" : t.status === "in_progress" ? "#f59e0b" : "#475569", fontSize: 10 }}>●</span>
                        <span style={{ color: "#e2e8f0" }}>{t.title}</span>
                        {t.assigned_to && <span style={{ color: "#60a5fa", fontSize: 10 }}>@{t.assigned_to}</span>}
                      </div>
                    ))}
                    <div style={{ marginTop: 6, fontSize: 10, color: "#475569" }}>
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
