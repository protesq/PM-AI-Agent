import React, { useState } from "react";
import { createProject, dockerStartProject, dockerStopProject, openFolder, updateProjectPath, pickFolder, generateProjectReport } from "../api/index.js";

const STATUS_COLOR = {
  active:    "#00ff88",
  completed: "#60a5fa",
  archived:  "#94a3b8",
};

function NewProjectModal({ onClose, onCreated }) {
  const [name, setName]           = useState("");
  const [description, setDesc]    = useState("");
  const [projectPath, setPath]    = useState("");
  const [autoStart, setAutoStart] = useState(true);
  const [loading, setLoading]     = useState(false);
  const [status, setStatus]       = useState(null); // {type:"info"|"success"|"error", msg}

  const submit = async () => {
    if (!name.trim()) { setStatus({ type: "error", msg: "Proje adı zorunlu" }); return; }
    setLoading(true);
    setStatus({ type: "info", msg: "Proje oluşturuluyor..." });
    try {
      const res = await createProject(name.trim(), description.trim(), projectPath.trim(), autoStart && !!projectPath.trim());
      if (!res.data.success) { setStatus({ type: "error", msg: res.data.error }); setLoading(false); return; }

      if (autoStart && projectPath.trim()) {
        setStatus({ type: "info", msg: "🐳 Docker başlatılıyor..." });
        const dr = res.data.dockerResult;
        if (dr && !dr.success) {
          setStatus({ type: "error", msg: `Docker hatası: ${dr.error}` });
          setLoading(false);
          onCreated(res.data.data);
          return;
        }
        setStatus({ type: "success", msg: "✅ Proje oluşturuldu ve Docker başlatıldı!" });
        await new Promise(r => setTimeout(r, 1200));
      }

      onCreated(res.data.data);
      onClose();
    } catch (e) {
      setStatus({ type: "error", msg: e.response?.data?.error || e.message });
    }
    setLoading(false);
  };

  const statusColor = { info: "#60a5fa", success: "#00ff88", error: "#ff4466" };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 24, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>

        <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 20 }}>➕ Yeni Proje Oluştur</div>

        {/* İsim */}
        <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>Proje Adı *</label>
        <input
          autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submit()}
          placeholder="ör. Mobile App"
          style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", padding: "8px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 12 }}
        />

        {/* Açıklama */}
        <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>Açıklama</label>
        <textarea
          value={description} onChange={e => setDesc(e.target.value)} rows={2}
          placeholder="Proje hakkında kısa açıklama..."
          style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", padding: "8px 12px", fontSize: 13, outline: "none", resize: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 12 }}
        />

        {/* Klasör yolu */}
        <label style={{ fontSize: 12, color: "#94a3b8", display: "block", marginBottom: 4 }}>
          🐳 Docker Klasör Yolu
          <span style={{ color: "#475569", marginLeft: 6 }}>(docker-compose.yml olan klasör)</span>
        </label>
        <input
          value={projectPath} onChange={e => setPath(e.target.value)}
          placeholder="ör. C:/Projects/MobileApp"
          style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", padding: "8px 12px", fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 12, fontFamily: "monospace" }}
        />

        {/* Auto start toggle */}
        {projectPath.trim() && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", marginBottom: 16, fontSize: 13, color: "#94a3b8" }}>
            <input
              type="checkbox" checked={autoStart} onChange={e => setAutoStart(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: "#7c3aed", cursor: "pointer" }}
            />
            Oluşturulunca Docker'ı otomatik başlat
          </label>
        )}

        {/* Status mesajı */}
        {status && (
          <div style={{ color: statusColor[status.type], fontSize: 12, marginBottom: 12, padding: "6px 10px", background: "rgba(0,0,0,0.3)", borderRadius: 6, border: `1px solid ${statusColor[status.type]}33` }}>
            {status.msg}
          </div>
        )}

        {/* Butonlar */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} disabled={loading}
            style={{ flex: 1, background: "none", border: "1px solid #334155", color: "#94a3b8", borderRadius: 8, padding: "8px 0", cursor: "pointer", fontSize: 13 }}>
            İptal
          </button>
          <button onClick={submit} disabled={loading || !name.trim()}
            style={{ flex: 2, background: loading || !name.trim() ? "#334155" : "#7c3aed", border: "none", color: "#fff", borderRadius: 8, padding: "8px 0", cursor: loading || !name.trim() ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 600 }}>
            {loading ? "⏳ İşleniyor..." : "✓ Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProjectsSidebar({ projects, loading, onRefresh, onProjectCreated, onReportCreated }) {
  const [expanded, setExpanded]     = useState({});
  const [showModal, setShowModal]   = useState(false);
  const [dockerStatus, setDStatus]  = useState({});
  const [pathInputs, setPathInputs] = useState({}); // {id: string}

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const handleCreated = (project) => { onProjectCreated?.(); onRefresh(); };

  const handleGenerateReport = async (e, project) => {
    e.stopPropagation();
    try {
      await generateProjectReport(project.id);
      onReportCreated?.();
    } catch { /* sessiz hata */ }
  };

  const handleDockerStart = async (e, project) => {
    e.stopPropagation();
    if (!project.path) { alert("Bu projeye Docker klasör yolu tanımlı değil.\nProjeyi düzenle veya agent'a söyle."); return; }
    setDStatus(prev => ({ ...prev, [project.id]: "starting" }));
    try {
      const res = await dockerStartProject(project.id);
      setDStatus(prev => ({ ...prev, [project.id]: res.data.success ? "ok" : "error" }));
    } catch { setDStatus(prev => ({ ...prev, [project.id]: "error" })); }
  };

  const handleDockerStop = async (e, project) => {
    e.stopPropagation();
    setDStatus(prev => ({ ...prev, [project.id]: "stopping" }));
    try {
      const res = await dockerStopProject(project.id);
      setDStatus(prev => ({ ...prev, [project.id]: res.data.success ? null : "error" }));
    } catch { setDStatus(prev => ({ ...prev, [project.id]: "error" })); }
  };

  return (
    <div style={{ flex: "0 0 auto", maxHeight: "55%", display: "flex", flexDirection: "column", borderBottom: "1px solid #1e293b" }}>

      {showModal && <NewProjectModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}

      {/* Header */}
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a0a0f", flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>📁 Projects ({projects.length})</span>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setShowModal(true)} title="Yeni proje"
            style={{ background: "#7c3aed", border: "none", color: "#fff", borderRadius: 4, padding: "2px 10px", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>+</button>
          <button onClick={onRefresh}
            style={{ background: "none", border: "1px solid #334155", color: "#94a3b8", borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontSize: 11 }}>↻</button>
        </div>
      </div>

      {/* Boşken CTA */}
      {!loading && projects.length === 0 && (
        <div style={{ padding: 16, textAlign: "center" }}>
          <div style={{ color: "#475569", fontSize: 12, marginBottom: 10 }}>Henüz proje yok.</div>
          <button onClick={() => setShowModal(true)}
            style={{ background: "#7c3aed", border: "none", color: "#fff", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            ➕ İlk Projeyi Oluştur
          </button>
        </div>
      )}

      {/* List */}
      <div style={{ overflowY: "auto", flex: 1, padding: "8px 0" }}>
        {loading && <div style={{ color: "#475569", fontSize: 12, textAlign: "center", padding: 16 }}>Yükleniyor...</div>}

        {projects.map((p) => {
          const ds = dockerStatus[p.id];
          return (
            <div key={p.id} style={{ margin: "2px 8px" }}>
              <div onClick={() => toggle(p.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, cursor: "pointer", background: expanded[p.id] ? "#1e293b" : "transparent", transition: "background 0.15s" }}>
                <span style={{ color: STATUS_COLOR[p.status] || "#94a3b8", fontSize: 8 }}>●</span>
                <span style={{ flex: 1, fontSize: 12, color: "#e2e8f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                {p.path && (
                  <button
                    onClick={e => { e.stopPropagation(); openFolder(p.path).catch(err => alert("Klasör açılamadı: " + (err.response?.data?.error || err.message))); }}
                    title={p.path}
                    style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "0 2px", lineHeight: 1, color: "#60a5fa" }}
                  >📂</button>
                )}
                <span style={{ fontSize: 10, color: "#475569" }}>#{p.id}</span>
                <span style={{ fontSize: 10, color: "#475569" }}>{expanded[p.id] ? "▲" : "▼"}</span>
              </div>

              {expanded[p.id] && (
                <div style={{ paddingLeft: 16, paddingRight: 10, paddingBottom: 8 }}>
                  {p.description && <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{p.description}</div>}
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 2 }}>
                    Durum: <span style={{ color: STATUS_COLOR[p.status] || "#94a3b8" }}>{p.status}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#475569", marginBottom: 6 }}>
                    Oluşturuldu: {new Date(p.created_at).toLocaleDateString("tr-TR")}
                  </div>
                  <button onClick={e => handleGenerateReport(e, p)}
                    style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 6, padding: "4px 0", cursor: "pointer", fontSize: 11, marginBottom: 6 }}>
                    📋 Rapor Oluştur
                  </button>

                  {/* Konum */}
                  {p.path ? (
                    <div style={{ marginBottom: 6 }}>
                      <div style={{ fontSize: 10, color: "#475569", marginBottom: 6, fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.path}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); openFolder(p.path).catch(err => alert("Klasör açılamadı: " + (err.response?.data?.error || err.message))); }}
                        style={{ width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#e2e8f0", borderRadius: 6, padding: "5px 0", cursor: "pointer", fontSize: 11, marginBottom: 6, fontWeight: 500 }}
                      >📂 Projeyi Aç</button>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={e => handleDockerStart(e, p)} disabled={ds === "starting"}
                          style={{ flex: 1, background: ds === "ok" ? "#064e3b" : "#0f2027", border: "1px solid #1d4ed8", color: ds === "starting" ? "#475569" : "#60a5fa", borderRadius: 6, padding: "4px 0", cursor: "pointer", fontSize: 11 }}>
                          {ds === "starting" ? "⏳ Başlatılıyor..." : "▶ Docker Başlat"}
                        </button>
                        <button onClick={e => handleDockerStop(e, p)} disabled={ds === "stopping"}
                          style={{ flex: 1, background: "#1a0a0a", border: "1px solid #7f1d1d", color: ds === "stopping" ? "#475569" : "#f87171", borderRadius: 6, padding: "4px 0", cursor: "pointer", fontSize: 11 }}>
                          {ds === "stopping" ? "⏳ Durduruluyor..." : "■ Docker Durdur"}
                        </button>
                      </div>
                      {ds === "error" && <div style={{ fontSize: 10, color: "#ff4466", marginTop: 4 }}>⚠ Docker işlemi başarısız</div>}
                    </div>
                  ) : (
                    <button
                      onClick={async e => {
                        e.stopPropagation();
                        const res = await pickFolder().catch(() => null);
                        const selected = res?.data?.path;
                        if (!selected) return;
                        await updateProjectPath(p.id, selected).catch(() => {});
                        onRefresh();
                      }}
                      style={{ background: "#1e293b", border: "1px solid #334155", color: "#94a3b8", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 11, marginBottom: 6 }}
                    >📂 Klasör Seç</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
