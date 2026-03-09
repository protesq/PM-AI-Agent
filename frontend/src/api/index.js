import axios from "axios";

export const sendAgentMessage = (message) =>
  axios.post("/api/agent/request", { message });

export const getProjects = () => axios.get("/api/projects");

export const createProject = (name, description, path, autoStart) =>
  axios.post("/api/projects", { name, description, path, autoStart });

export const dockerStartProject = (id) =>
  axios.post(`/api/projects/${id}/docker/start`);

export const dockerStopProject = (id) =>
  axios.post(`/api/projects/${id}/docker/stop`);

export const getSystemPrompt = () =>
  axios.get("/api/settings/system-prompt");

export const saveSystemPrompt = (content) =>
  axios.put("/api/settings/system-prompt", { content });

export const getReports = () => axios.get("/api/reports");

export const openFolder = (folderPath) =>
  axios.post("/api/settings/open-folder", { folderPath });

export const updateProjectPath = (id, path) =>
  axios.patch(`/api/projects/${id}/path`, { path });

export const pickFolder = () =>
  axios.get("/api/settings/pick-folder");

export const generateProjectReport = (id) =>
  axios.post(`/api/projects/${id}/report`);

export const getEnvSettings = () =>
  axios.get("/api/settings/env");

export const saveEnvSettings = (data) =>
  axios.put("/api/settings/env", data);

export const getDockerCompose = () =>
  axios.get("/api/settings/docker-compose");

export const saveDockerCompose = (content) =>
  axios.put("/api/settings/docker-compose", { content });
