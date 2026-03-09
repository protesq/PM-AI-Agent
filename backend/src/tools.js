const { query } = require("./db");

function makeResult(data) {
  return { success: true, data, error: null, timestamp: new Date().toISOString() };
}

function makeError(err) {
  return { success: false, data: null, error: err.message || String(err), timestamp: new Date().toISOString() };
}

async function getProjects() {
  try {
    const rows = await query("SELECT * FROM projects ORDER BY created_at DESC");
    return makeResult(rows);
  } catch (err) {
    return makeError(err);
  }
}

async function createProject(name, description) {
  try {
    const result = await query(
      "INSERT INTO projects (name, description) VALUES (?, ?)",
      [name, description || ""]
    );
    const rows = await query("SELECT * FROM projects WHERE id = ?", [result.insertId]);
    return makeResult(rows[0]);
  } catch (err) {
    return makeError(err);
  }
}

async function getTasks(project_id) {
  try {
    const rows = await query(
      "SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC",
      [project_id]
    );
    return makeResult(rows);
  } catch (err) {
    return makeError(err);
  }
}

async function createTask(project_id, title, assigned_to) {
  try {
    const result = await query(
      "INSERT INTO tasks (project_id, title, assigned_to) VALUES (?, ?, ?)",
      [project_id, title, assigned_to || null]
    );
    const rows = await query("SELECT * FROM tasks WHERE id = ?", [result.insertId]);
    return makeResult(rows[0]);
  } catch (err) {
    return makeError(err);
  }
}

async function updateTaskStatus(task_id, status) {
  try {
    await query("UPDATE tasks SET status = ? WHERE id = ?", [status, task_id]);
    const rows = await query("SELECT * FROM tasks WHERE id = ?", [task_id]);
    if (rows.length === 0) return makeError(new Error(`Task ${task_id} not found`));
    return makeResult(rows[0]);
  } catch (err) {
    return makeError(err);
  }
}

async function generateReport(project_id) {
  try {
    const projects = await query("SELECT * FROM projects WHERE id = ?", [project_id]);
    if (projects.length === 0) return makeError(new Error(`Project ${project_id} not found`));

    const tasks = await query("SELECT * FROM tasks WHERE project_id = ?", [project_id]);
    const project = projects[0];

    const total = tasks.length;
    const done = tasks.filter((t) => t.status === "done").length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const todo = tasks.filter((t) => t.status === "todo").length;

    const content = JSON.stringify({
      project: { id: project.id, name: project.name, status: project.status },
      summary: { total_tasks: total, done, in_progress: inProgress, todo },
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        assigned_to: t.assigned_to,
      })),
      generated_at: new Date().toISOString(),
    });

    const result = await query(
      "INSERT INTO reports (project_id, content, created_by_agent) VALUES (?, ?, TRUE)",
      [project_id, content]
    );
    const report = await query("SELECT * FROM reports WHERE id = ?", [result.insertId]);
    return makeResult(report[0]);
  } catch (err) {
    return makeError(err);
  }
}

module.exports = { getProjects, createProject, getTasks, createTask, updateTaskStatus, generateReport };
