import React, { useEffect } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  BaseEdge,
  EdgeLabelRenderer,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// ── Custom edge ───────────────────────────────────────────────────────────────
// Node handle'larından çıkar/girer, orta kısım offset kadar yukarı/aşağı kıvrılır.
function OffsetEdge({ id, sourceX, sourceY, targetX, targetY, style, markerEnd, label, data }) {
  const offset = data?.yOffset ?? 0;
  const dx = Math.abs(targetX - sourceX);
  const bend = dx * 0.4; // kontrol noktası yatay mesafesi

  // İki kontrol noktası: yatayda kayık, dikeyde offset kadar sapıyor
  const c1x = sourceX + bend;
  const c1y = sourceY + offset;
  const c2x = targetX - bend;
  const c2y = targetY + offset;

  const edgePath = `M${sourceX},${sourceY} C${c1x},${c1y} ${c2x},${c2y} ${targetX},${targetY}`;
  const mx = (sourceX + targetX) / 2;
  const my = (sourceY + targetY) / 2 + offset;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {label && (
        <EdgeLabelRenderer>
          <div style={{
            position: "absolute",
            transform: `translate(-50%,-50%) translate(${mx}px,${my}px)`,
            pointerEvents: "none",
            fontSize: 11,
            color: "#94a3b8",
            background: "#0f172a",
            padding: "2px 6px",
            borderRadius: 4,
            whiteSpace: "nowrap",
          }}>
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const edgeTypes = { offsetEdge: OffsetEdge };

// ── Stil sabitleri ────────────────────────────────────────────────────────────
const BASE_NODE_STYLE = {
  background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155",
  borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 500,
  minWidth: 160, textAlign: "center",
};
const DOCKER_NODE_STYLE = {
  ...BASE_NODE_STYLE, background: "#0f2027", border: "1px solid #1d4ed8",
};

function getNodeStyle(id, activeNode, nodeStatus) {
  const status = nodeStatus[id];
  const isDocker = ["docker", "docker_frontend", "docker_backend", "docker_db", "docker_pma"].includes(id);
  const base = isDocker ? DOCKER_NODE_STYLE : BASE_NODE_STYLE;
  if (status === "error") return { ...base, border: "2px solid #ff4466", boxShadow: "0 0 12px #ff4466" };
  if (activeNode === id || status === "success") return { ...base, border: "2px solid #00ff88", boxShadow: "0 0 12px #00ff88" };
  return base;
}

// ── Edge yardımcıları ─────────────────────────────────────────────────────────
const ARROW = { type: MarkerType.ArrowClosed, color: "#334155" };
const ARROW_D = { type: MarkerType.ArrowClosed, color: "#1d4ed8" };

// Tek yönlü ok
const mkOne = (id, source, target, label, extra = {}) => ({
  id, source, target, label,
  type: "offsetEdge",
  animated: true,
  style: { stroke: "#334155", strokeWidth: 2, ...extra.style },
  markerEnd: ARROW,
  data: { yOffset: 0 },
  ...extra,
});

// Çift yönlü ok (haberleşme): her iki ucunda da ok var
const mkBi = (id, source, target, label) => ({
  id, source, target, label,
  type: "offsetEdge",
  animated: true,
  style: { stroke: "#334155", strokeWidth: 2 },
  markerStart: { type: MarkerType.ArrowClosed, color: "#334155" },
  markerEnd: ARROW,
  data: { yOffset: 0 },
});

const mkDocker = (id, source, target, label = "") => ({
  id, source, target, label,
  type: "offsetEdge",
  animated: false,
  style: { stroke: "#1d4ed8", strokeWidth: 1.5, strokeDasharray: "4,3" },
  markerEnd: ARROW_D,
  data: { yOffset: 0 },
});

const INITIAL_EDGES = [
  // Kullanıcıdan istek — tek yön
  mkOne("e1", "user", "frontend", "prompt"),
  // Karşılıklı haberleşen çiftler — çift ok
  mkBi("e2", "frontend", "agent", "request / response"),
  mkBi("e_agents", "agent", "agent2", "inter-agent msg"),
  mkBi("e3", "agent", "backend", "tool_use / tool_result"),
  mkBi("e4", "backend", "db", "SQL / result"),
  // Rapor — tek yön, kesikli
  mkOne("e8", "agent", "report", "auto report",
    { style: { stroke: "#334155", strokeWidth: 2, strokeDasharray: "5,5" } }),
  // Docker
  mkDocker("d1", "agent", "docker", "docker CLI"),
  mkDocker("d2", "docker", "docker_frontend"),
  mkDocker("d3", "docker", "docker_backend"),
  mkDocker("d4", "docker", "docker_db"),
  mkDocker("d5", "docker", "docker_pma"),
];

// ── Node tanımları ────────────────────────────────────────────────────────────
const NODE_DEFS = [
  { id: "user", label: "👤 User", position: { x: 0, y: 140 } },
  { id: "frontend", label: "⚛️ Frontend (React)", position: { x: 220, y: 140 } },
  { id: "agent", label: "🤖 Claude Agent", position: { x: 460, y: 140 } },
  { id: "agent2", label: "🤖 Peer Agent", position: { x: 460, y: 0 } },
  { id: "backend", label: "🟢 Backend (Node.js)", position: { x: 700, y: 140 } },
  { id: "db", label: "🗄️ MySQL DB", position: { x: 940, y: 140 } },
  { id: "report", label: "📋 Report", position: { x: 460, y: 320 } },
  { id: "docker", label: "🐳 Docker Daemon", position: { x: 460, y: 500 }, docker: true },
  { id: "docker_frontend", label: "📦 frontend:3000", position: { x: 100, y: 660 }, docker: true },
  { id: "docker_backend", label: "📦 backend:5000", position: { x: 340, y: 660 }, docker: true },
  { id: "docker_db", label: "📦 db:3306", position: { x: 580, y: 660 }, docker: true },
  { id: "docker_pma", label: "📦 phpmyadmin:8080", position: { x: 820, y: 660 }, docker: true },
];

const INITIAL_NODES = NODE_DEFS.map((def) => ({
  id: def.id,
  position: def.position,
  data: { label: def.label },
  style: def.docker ? DOCKER_NODE_STYLE : BASE_NODE_STYLE,
  draggable: true,
}));

// ── Bileşen ───────────────────────────────────────────────────────────────────
export default function AgentFlowCanvas({ activeNode, nodeStatus }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({ ...n, style: getNodeStyle(n.id, activeNode, nodeStatus) }))
    );
  }, [activeNode, nodeStatus, setNodes]);

  return (
    <div style={{ width: "100%", height: "100%", background: "#0a0a0f" }}>
      <ReactFlow
        nodes={nodes}
        edges={INITIAL_EDGES}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.25 }}
        nodesDraggable
        panOnDrag
        zoomOnScroll
        nodesConnectable={false}
        elementsSelectable={false}
        style={{ background: "#0a0a0f" }}
      >
        <Background color="#1e293b" gap={20} />
        <Controls style={{ background: "#1e293b", border: "1px solid #334155" }} />
        <MiniMap
          style={{ background: "#0f172a", border: "1px solid #334155" }}
          nodeColor={(n) => n.id.startsWith("docker") ? "#1d4ed8" : "#334155"}
          maskColor="rgba(0,0,0,0.4)"
        />
      </ReactFlow>

      <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(15,23,42,0.92)", border: "1px solid #334155", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#94a3b8", pointerEvents: "none" }}>
        <div style={{ fontWeight: 700, marginBottom: 6, color: "#e2e8f0" }}>Architecture Flow</div>
        {[
          { color: "#00ff88", label: "Active / Success" },
          { color: "#ff4466", label: "Error" },
          { color: "#1d4ed8", label: "Docker layer" },
          { color: "#334155", label: "Idle" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}
