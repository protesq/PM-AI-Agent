import React, { useState, useEffect } from "react";
import { getEnvSettings, saveEnvSettings, getDockerCompose, saveDockerCompose } from "../api/index.js";

// ── Yardımcılar ──────────────────────────────────────────────────────────────

// YAML'dan basit değer okuma (regex tabanlı)
function yamlGet(yaml, key) {
  const m = yaml.match(new RegExp(`${key}:\\s*(.+)`));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
}

// Port "HOST:CONTAINER" formatından host portunu al
function hostPort(yaml, service) {
  // services altında service: ... ports: - "X:Y" ilk eşleşme
  const block = yaml.match(new RegExp(`${service}:[\\s\\S]*?(?=\\n\\w|$)`));
  if (!block) return "";
  const p = block[0].match(/["']?(\d+):\d+["']?/);
  return p ? p[1] : "";
}

// YAML'da port değerini güncelle (servis bloğunda ilk "H:C" → "newH:C")
function replaceHostPort(yaml, service, newHost) {
  // service: bloğunu bul, içindeki ilk port satırını değiştir
  return yaml.replace(
    new RegExp(`(${service}:[\\s\\S]*?- ["']?)\\d+(:\\d+["']?)`, ""),
    `$1${newHost}$2`
  );
}

// YAML'da env değerini güncelle: KEY: value
function replaceEnvVal(yaml, key, newVal) {
  return yaml.replace(new RegExp(`(${key}:\\s*)(.+)`), `$1${newVal}`);
}

// ── Form alanları tanımı ────────────────────────────────────────────────────
const DOCKER_FORM_FIELDS = [
  { key: "port_frontend",   label: "Frontend Host Port",   hint: "3000" },
  { key: "port_backend",    label: "Backend Host Port",    hint: "5000" },
  { key: "port_db",         label: "DB Host Port",         hint: "3306" },
  { key: "port_phpmyadmin", label: "phpMyAdmin Host Port", hint: "8080" },
  { key: "MYSQL_ROOT_PASSWORD", label: "MySQL Root Şifre", hint: "secret" },
  { key: "MYSQL_DATABASE",      label: "MySQL Database",   hint: "projectdb" },
  { key: "MYSQL_USER",          label: "MySQL User",       hint: "admin" },
  { key: "MYSQL_PASSWORD",      label: "MySQL Password",   hint: "secret" },
];

function parseFormFromYaml(yaml) {
  return {
    port_frontend:        hostPort(yaml, "frontend"),
    port_backend:         hostPort(yaml, "backend"),
    port_db:              hostPort(yaml, "db"),
    port_phpmyadmin:      hostPort(yaml, "phpmyadmin"),
    MYSQL_ROOT_PASSWORD:  yamlGet(yaml, "MYSQL_ROOT_PASSWORD"),
    MYSQL_DATABASE:       yamlGet(yaml, "MYSQL_DATABASE"),
    MYSQL_USER:           yamlGet(yaml, "MYSQL_USER"),
    MYSQL_PASSWORD:       yamlGet(yaml, "MYSQL_PASSWORD"),
  };
}

function applyFormToYaml(yaml, form) {
  let y = yaml;
  if (form.port_frontend)   y = replaceHostPort(y, "frontend",   form.port_frontend);
  if (form.port_backend)    y = replaceHostPort(y, "backend",    form.port_backend);
  if (form.port_db)         y = replaceHostPort(y, "\\s+db",     form.port_db);
  if (form.port_phpmyadmin) y = replaceHostPort(y, "phpmyadmin", form.port_phpmyadmin);
  if (form.MYSQL_ROOT_PASSWORD) y = replaceEnvVal(y, "MYSQL_ROOT_PASSWORD", form.MYSQL_ROOT_PASSWORD);
  if (form.MYSQL_DATABASE)      y = replaceEnvVal(y, "MYSQL_DATABASE",      form.MYSQL_DATABASE);
  if (form.MYSQL_USER)          y = replaceEnvVal(y, "MYSQL_USER",          form.MYSQL_USER);
  if (form.MYSQL_PASSWORD)      y = replaceEnvVal(y, "MYSQL_PASSWORD",      form.MYSQL_PASSWORD);
  return y;
}

// ── ENV sekmesi ─────────────────────────────────────────────────────────────
const ENV_FIELDS = [
  { key: "MYSQL_HOST",     label: "MySQL Host",      placeholder: "localhost" },
  { key: "MYSQL_PORT",     label: "MySQL Port",      placeholder: "3306" },
  { key: "MYSQL_USER",     label: "MySQL Kullanıcı", placeholder: "root" },
  { key: "MYSQL_PASSWORD", label: "MySQL Şifre",     placeholder: "••••••", type: "password" },
  { key: "MYSQL_DATABASE", label: "Veritabanı",      placeholder: "projectdb" },
  { key: "PORT",           label: "Backend Port",    placeholder: "5000" },
];

function EnvTab() {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getEnvSettings().then(res => setValues(res.data.data || {})).catch(() => setStatus("error"));
  }, []);

  const save = async () => {
    setSaving(true); setStatus(null);
    try { await saveEnvSettings(values); setStatus("saved"); setTimeout(() => setStatus(null), 2500); }
    catch { setStatus("error"); }
    setSaving(false);
  };

  return (
    <div>
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {ENV_FIELDS.map(({ key, label, placeholder, type }) => (
          <div key={key}>
            <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>{label}</label>
            <input type={type || "text"} value={values[key] || ""} onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))} placeholder={placeholder}
              style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", padding: "8px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
          </div>
        ))}
      </div>
      <div style={{ padding: "12px 20px", borderTop: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12 }}>
          {status === "saved" && <span style={{ color: "#00ff88" }}>✓ Kaydedildi</span>}
          {status === "error" && <span style={{ color: "#ff4466" }}>⚠ Hata</span>}
        </span>
        <button onClick={save} disabled={saving}
          style={{ background: saving ? "#1e293b" : "#7c3aed", border: "none", color: saving ? "#475569" : "#fff", borderRadius: 8, padding: "7px 20px", cursor: saving ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
          {saving ? "Kaydediliyor..." : "💾 Kaydet"}
        </button>
      </div>
    </div>
  );
}

// ── Docker Compose sekmesi ───────────────────────────────────────────────────
function DockerTab() {
  const [yaml, setYaml]         = useState("");
  const [original, setOriginal] = useState("");
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [status, setStatus]     = useState(null);
  const [view, setView]         = useState("form"); // "form" | "yaml"

  useEffect(() => {
    getDockerCompose().then(res => {
      const c = res.data.data?.content || "";
      setYaml(c); setOriginal(c); setForm(parseFormFromYaml(c));
    }).catch(() => setStatus("error"));
  }, []);

  // Form değişince YAML'ı da güncelle
  const handleFormChange = (key, val) => {
    const updated = { ...form, [key]: val };
    setForm(updated);
    setYaml(applyFormToYaml(yaml, { [key]: val }));
  };

  // YAML değişince formu da güncelle
  const handleYamlChange = (val) => {
    setYaml(val);
    setForm(parseFormFromYaml(val));
  };

  const save = async () => {
    setSaving(true); setStatus(null);
    try { await saveDockerCompose(yaml); setOriginal(yaml); setStatus("saved"); setTimeout(() => setStatus(null), 2500); }
    catch { setStatus("error"); }
    setSaving(false);
  };

  const isDirty = yaml !== original;

  const subTabStyle = (active) => ({
    padding: "5px 12px", fontSize: 12, cursor: "pointer", borderRadius: 6,
    background: active ? "#334155" : "none", border: "none",
    color: active ? "#e2e8f0" : "#64748b",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Alt sekme geçişi */}
      <div style={{ padding: "10px 20px", borderBottom: "1px solid #1e293b", display: "flex", gap: 4 }}>
        <button style={subTabStyle(view === "form")} onClick={() => setView("form")}>📝 Form</button>
        <button style={subTabStyle(view === "yaml")} onClick={() => setView("yaml")}>💻 YAML</button>
      </div>

      {/* Form görünümü */}
      {view === "form" && (
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {DOCKER_FORM_FIELDS.map(({ key, label, hint }) => (
            <div key={key}>
              <label style={{ fontSize: 11, color: "#94a3b8", display: "block", marginBottom: 3 }}>{label}</label>
              <input value={form[key] || ""} onChange={e => handleFormChange(key, e.target.value)} placeholder={hint}
                style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", padding: "7px 10px", fontSize: 12, outline: "none", boxSizing: "border-box", fontFamily: "monospace" }} />
            </div>
          ))}
        </div>
      )}

      {/* YAML editörü */}
      {view === "yaml" && (
        <textarea value={yaml} onChange={e => handleYamlChange(e.target.value)} spellCheck={false}
          style={{ background: "#0a0a0f", border: "none", color: "#e2e8f0", padding: "16px 20px", fontSize: 12,
            fontFamily: "'Cascadia Code','Fira Code','Consolas',monospace", lineHeight: 1.6, resize: "none", outline: "none", minHeight: 320 }} />
      )}

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12 }}>
          {isDirty && <span style={{ color: "#f59e0b" }}>● Kaydedilmemiş değişiklik</span>}
          {status === "saved" && <span style={{ color: "#00ff88" }}>✓ Kaydedildi</span>}
          {status === "error" && <span style={{ color: "#ff4466" }}>⚠ Hata</span>}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {isDirty && (
            <button onClick={() => { setYaml(original); setForm(parseFormFromYaml(original)); setStatus(null); }}
              style={{ background: "none", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontSize: 13 }}>
              Geri Al
            </button>
          )}
          <button onClick={save} disabled={saving || !isDirty}
            style={{ background: saving || !isDirty ? "#1e293b" : "#7c3aed", border: "none", color: saving || !isDirty ? "#475569" : "#fff", borderRadius: 8, padding: "7px 20px", cursor: saving || !isDirty ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
            {saving ? "Kaydediliyor..." : "💾 Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ana modal ────────────────────────────────────────────────────────────────
export default function EnvSettingsModal({ onClose }) {
  const [tab, setTab] = useState("env");

  const tabStyle = (active) => ({
    padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
    color: active ? "#e2e8f0" : "#64748b", background: "none", border: "none",
    borderBottom: `2px solid ${active ? "#7c3aed" : "transparent"}`,
  });

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, width: "min(600px,95vw)", maxHeight: "88vh", boxShadow: "0 24px 80px rgba(0,0,0,0.8)", display: "flex", flexDirection: "column" }}>

        <div style={{ padding: "16px 20px 0", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 10 }}>🔧 Ayarlar</div>
            <div style={{ display: "flex" }}>
              <button style={tabStyle(tab === "env")}    onClick={() => setTab("env")}>🗄️ Bağlantı</button>
              <button style={tabStyle(tab === "docker")} onClick={() => setTab("docker")}>🐳 Docker Compose</button>
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 20, marginTop: 2 }}>✕</button>
        </div>

        <div style={{ overflowY: "auto" }}>
          {tab === "env"    && <EnvTab />}
          {tab === "docker" && <DockerTab />}
        </div>
      </div>
    </div>
  );
}
