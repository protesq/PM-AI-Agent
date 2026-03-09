import React, { useState, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import ChatPanel from "./components/ChatPanel.jsx";
import ProjectsSidebar from "./components/ProjectsSidebar.jsx";
import ReportsList from "./components/ReportsList.jsx";
import AgentFlowCanvas from "./components/AgentFlowCanvas.jsx";
import { sendAgentMessage, getProjects, getReports } from "./api/index.js";

const ANIMATION_SEQUENCE = [
  { node: "user",     delay: 0 },
  { node: "frontend", delay: 500 },
  { node: "agent",    delay: 1000 },
  { node: "backend",  delay: 1500 },
  { node: "db",       delay: 2000 },
  { node: "backend",  delay: 2500 },
  { node: "agent",    delay: 3000 },
  { node: "report",   delay: 3500 },
  { node: null,       delay: 4500 },
];

const DOCKER_ANIMATION_SEQUENCE = [
  { node: "user",     delay: 0 },
  { node: "frontend", delay: 500 },
  { node: "agent",    delay: 1000 },
  { node: "docker",   delay: 1600 },
  { node: "docker_frontend", delay: 2100 },
  { node: "docker_backend",  delay: 2300 },
  { node: "docker_db",       delay: 2500 },
  { node: "docker_pma",      delay: 2700 },
  { node: "agent",    delay: 3200 },
  { node: "frontend", delay: 3700 },
  { node: null,       delay: 4500 },
];

function isDockerMessage(text) {
  return /docker|konteyner|container|servis|restart|stop|start|log|stats|rebuild/i.test(text);
}

export default function App() {
  const [activeNode, setActiveNode] = useState(null);
  const [nodeStatus, setNodeStatus] = useState({});
  const [messages, setMessages] = useState([]);
  const [projects, setProjects] = useState([]);
  const [reports, setReports] = useState([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true);
    try {
      const res = await getProjects();
      if (res.data.success) setProjects(res.data.data);
    } catch (_) {}
    setLoadingProjects(false);
  }, []);

  const refreshReports = useCallback(async () => {
    try {
      const res = await getReports();
      if (res.data.success) setReports(res.data.data);
    } catch (_) {}
  }, []);

  const runAnimation = useCallback((message = "") => {
    const sequence = isDockerMessage(message)
      ? DOCKER_ANIMATION_SEQUENCE
      : ANIMATION_SEQUENCE;
    setNodeStatus({});
    sequence.forEach(({ node, delay }) => {
      setTimeout(() => {
        setActiveNode(node);
        if (node) {
          setNodeStatus((prev) => ({ ...prev, [node]: "success" }));
        }
      }, delay);
    });
  }, []);

  const handleSend = useCallback(
    async (message) => {
      // Add user message
      setMessages((prev) => [...prev, { role: "user", text: message }]);
      runAnimation(message);

      // Add loading placeholder
      const loadingId = Date.now();
      setMessages((prev) => [...prev, { role: "agent", text: "", loading: true, id: loadingId }]);

      try {
        const res = await sendAgentMessage(message, messages.filter((m) => !m.loading));
        const { data, steps, error } = res.data;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  role: "agent",
                  text: data?.response || error || "No response",
                  steps: steps || [],
                  loading: false,
                  id: loadingId,
                }
              : m
          )
        );

        // Update node status based on steps
        if (steps && steps.length > 0) {
          const newStatus = {};
          steps.forEach((s) => {
            if (s.step === "agent_called" || s.step === "response_generated") newStatus["agent"] = s.status;
            if (s.step === "db_queried") newStatus["db"] = s.status;
            if (s.step === "tool_executed") {
              newStatus["backend"] = s.status;
              newStatus["agent"] = s.status;
            }
            if (s.step === "report_created") newStatus["report"] = s.status;
            if (s.step === "docker_exec") {
              newStatus["docker"] = s.status;
              // Hangi alt servise dokunulduğunu detail'den çıkar
              if (s.detail) {
                if (s.detail.includes("frontend")) newStatus["docker_frontend"] = s.status;
                if (s.detail.includes("backend"))  newStatus["docker_backend"]  = s.status;
                if (s.detail.includes("db"))        newStatus["docker_db"]       = s.status;
                if (s.detail.includes("phpmyadmin") || s.detail.includes("pma")) newStatus["docker_pma"] = s.status;
                // Genel komutlar tüm servisleri göster
                if (s.detail.includes("docker_status") || s.detail.includes("docker_list") || s.detail.includes("docker_get_stats")) {
                  ["docker_frontend","docker_backend","docker_db","docker_pma"].forEach((k) => {
                    newStatus[k] = s.status;
                  });
                }
              }
            }
          });
          setNodeStatus((prev) => ({ ...prev, ...newStatus }));
        }

        await refreshProjects();
        await refreshReports();
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  role: "agent",
                  text: `❌ ${err.response?.data?.error || err.response?.data?.message || err.message}`,
                  steps: [{ step: "agent_called", status: "error", timestamp: new Date().toISOString() }],
                  loading: false,
                  id: loadingId,
                }
              : m
          )
        );
        setNodeStatus((prev) => ({ ...prev, agent: "error" }));
      }
    },
    [runAnimation, refreshProjects, refreshReports]
  );

  // Load initial data
  React.useEffect(() => {
    refreshProjects();
    refreshReports();
  }, []);

  return (
    <ReactFlowProvider>
      <div
        style={{
          display: "flex",
          height: "100vh",
          width: "100vw",
          background: "#0a0a0f",
          overflow: "hidden",
        }}
      >
        {/* Left sidebar */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            borderRight: "1px solid #1e293b",
            overflow: "hidden",
          }}
        >
          <ProjectsSidebar
            projects={projects}
            loading={loadingProjects}
            onRefresh={refreshProjects}
            onProjectCreated={refreshProjects}
            onReportCreated={refreshReports}
          />
          <ReportsList reports={reports} onRefresh={refreshReports} />
        </div>

        {/* Center: React Flow canvas */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <AgentFlowCanvas activeNode={activeNode} nodeStatus={nodeStatus} />
        </div>

        {/* Right: Chat */}
        <div
          style={{
            width: 340,
            flexShrink: 0,
            borderLeft: "1px solid #1e293b",
          }}
        >
          <ChatPanel messages={messages} onSend={handleSend} />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
