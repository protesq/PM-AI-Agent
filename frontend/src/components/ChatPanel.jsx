import React, { useState, useRef, useEffect } from "react";
import SystemPromptEditor from "./SystemPromptEditor.jsx";
import EnvSettingsModal from "./EnvSettingsModal.jsx";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function useSpinner() {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % SPINNER_FRAMES.length), 100);
    return () => clearInterval(id);
  }, []);
  return SPINNER_FRAMES[frame];
}

function StepIcon({ status }) {
  if (status === "success") return <span style={{ color: "#00ff88" }}>✅</span>;
  if (status === "error") return <span style={{ color: "#ff4466" }}>❌</span>;
  return <SpinnerInline />;
}

function SpinnerInline() {
  const frame = useSpinner();
  return <span style={{ color: "#94a3b8" }}>{frame}</span>;
}

function StepsList({ steps }) {
  if (!steps || steps.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 8,
        borderTop: "1px solid #334155",
        paddingTop: 8,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#94a3b8" }}>
          <StepIcon status={s.status} />
          <span style={{ color: s.status === "error" ? "#ff4466" : s.status === "success" ? "#86efac" : "#94a3b8" }}>
            { s.step === "fs_exec"    ? "📝 " + s.step
            : s.step === "mysql_exec" ? "🗄️ " + s.step
            : s.step === "docker_exec"? "🐳 " + s.step
            : s.step }
          </span>
          <span style={{ opacity: 0.6 }}>— {s.status}</span>
          {s.detail && <span style={{ opacity: 0.5, marginLeft: 4 }}>({s.detail})</span>}
        </div>
      ))}
    </div>
  );
}

function LoadingBubble() {
  const frame = useSpinner();
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "80%",
          background: "#2d1b4e",
          borderRadius: "12px 12px 12px 2px",
          padding: "10px 14px",
          fontSize: 13,
          color: "#c4b5fd",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>{frame}</span>
        <span style={{ color: "#94a3b8" }}>Agent thinking...</span>
      </div>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  if (msg.loading) return <LoadingBubble />;

  return (
    <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", marginBottom: 12 }}>
      <div
        style={{
          maxWidth: "85%",
          background: isUser ? "#1e3a5f" : "#2d1b4e",
          borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
          padding: "10px 14px",
          fontSize: 13,
          color: isUser ? "#bfdbfe" : "#e9d5ff",
          lineHeight: 1.5,
          wordBreak: "break-word",
        }}
      >
        {!isUser && (
          <div style={{ fontSize: 11, color: "#7c3aed", marginBottom: 4, fontWeight: 600 }}>
            🤖 Claude Agent
          </div>
        )}
        <div style={{ whiteSpace: "pre-wrap" }}>{msg.text}</div>
        {!isUser && <StepsList steps={msg.steps} />}
      </div>
    </div>
  );
}

export default function ChatPanel({ messages, onSend }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showEnvSettings, setShowEnvSettings]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    await onSend(text);
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0f172a" }}>
      {showPromptEditor && <SystemPromptEditor onClose={() => setShowPromptEditor(false)} />}
      {showEnvSettings  && <EnvSettingsModal   onClose={() => setShowEnvSettings(false)} />}
      {/* Header */}
      <div
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid #1e293b",
          fontWeight: 700,
          fontSize: 14,
          color: "#e2e8f0",
          background: "#0a0a0f",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>💬 AI Agent Chat</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setShowEnvSettings(true)}  title="Bağlantı Ayarları" style={{ background: "none", border: "1px solid #334155", color: "#64748b", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 13 }}>🔧</button>
          <button onClick={() => setShowPromptEditor(true)} title="Sistem Promptu"    style={{ background: "none", border: "1px solid #334155", color: "#64748b", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 13 }}>⚙️</button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>
        {messages.length === 0 && (
          <div style={{ color: "#475569", fontSize: 13, textAlign: "center", marginTop: 80 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
            <div style={{ color: "#64748b" }}>Ne yapmamı istersin?</div>
          </div>
        )}
        {messages.map((m, i) => (
          <Message key={m.id || i} msg={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "12px",
          borderTop: "1px solid #1e293b",
          background: "#0a0a0f",
          display: "flex",
          gap: 8,
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message the AI agent..."
          rows={2}
          disabled={sending}
          style={{
            flex: 1,
            background: "#1e293b",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#e2e8f0",
            padding: "8px 12px",
            fontSize: 13,
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
          }}
        />
        <button
          onClick={submit}
          disabled={sending || !input.trim()}
          style={{
            background: sending || !input.trim() ? "#334155" : "#7c3aed",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0 16px",
            cursor: sending || !input.trim() ? "not-allowed" : "pointer",
            fontSize: 18,
            transition: "background 0.2s",
          }}
        >
          {sending ? "⏳" : "▶"}
        </button>
      </div>
    </div>
  );
}
