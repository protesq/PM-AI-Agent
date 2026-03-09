import React, { useState, useEffect } from "react";
import { getSystemPrompt, saveSystemPrompt } from "../api/index.js";

export default function SystemPromptEditor({ onClose }) {
  const [content, setContent]   = useState("");
  const [original, setOriginal] = useState("");
  const [saving, setSaving]     = useState(false);
  const [status, setStatus]     = useState(null); // "saved" | "error"

  useEffect(() => {
    getSystemPrompt()
      .then(res => {
        const c = res.data.data?.content || "";
        setContent(c);
        setOriginal(c);
      })
      .catch(() => setStatus("error"));
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus(null);
    try {
      await saveSystemPrompt(content);
      setOriginal(content);
      setStatus("saved");
      setTimeout(() => setStatus(null), 2500);
    } catch {
      setStatus("error");
    }
    setSaving(false);
  };

  const reset = () => { setContent(original); setStatus(null); };

  const isDirty = content !== original;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, width: "min(720px, 95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}
      >
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0" }}>⚙️ Sistem Promptu</div>
            <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>Ajanın davranışını buradan özelleştir. Her mesajda bu prompt kullanılır.</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        {/* Editor */}
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            background: "#0a0a0f",
            border: "none",
            borderBottom: "1px solid #1e293b",
            color: "#e2e8f0",
            padding: "16px 20px",
            fontSize: 13,
            fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
            lineHeight: 1.65,
            resize: "none",
            outline: "none",
            minHeight: 320,
            overflowY: "auto",
          }}
        />

        {/* Footer */}
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: "#475569" }}>
            {isDirty && <span style={{ color: "#f59e0b" }}>● Kaydedilmemiş değişiklik</span>}
            {status === "saved" && <span style={{ color: "#00ff88" }}>✓ Kaydedildi</span>}
            {status === "error" && <span style={{ color: "#ff4466" }}>⚠ Hata oluştu</span>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {isDirty && (
              <button onClick={reset} style={{ background: "none", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>
                Geri Al
              </button>
            )}
            <button onClick={onClose} style={{ background: "none", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>
              Kapat
            </button>
            <button
              onClick={save}
              disabled={saving || !isDirty}
              style={{ background: saving || !isDirty ? "#1e293b" : "#7c3aed", border: "none", color: saving || !isDirty ? "#475569" : "#fff", borderRadius: 8, padding: "7px 20px", cursor: saving || !isDirty ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}
            >
              {saving ? "Kaydediliyor..." : "💾 Kaydet"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
