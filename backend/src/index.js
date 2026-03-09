require("dotenv").config({ path: require("path").join(__dirname, "../../.env") });
const express = require("express");
const cors = require("cors");
const { createPool } = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/agent",    require("./routes/agent"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/tasks",    require("./routes/tasks"));
app.use("/api/reports",  require("./routes/reports"));
app.use("/api/settings", require("./routes/settings"));

app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" }, error: null });
});

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await createPool();
    const { query } = require("./db");

    // Tabloları oluştur (MySQL'de yoksa)
    await query(`CREATE TABLE IF NOT EXISTS projects (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT DEFAULT '',
      path TEXT DEFAULT '',
      status VARCHAR(50) DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).catch(() => {});

    await query(`CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT,
      title VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'todo',
      assigned_to VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`).catch(() => {});

    await query(`CREATE TABLE IF NOT EXISTS reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      project_id INT,
      content TEXT,
      created_by_agent TINYINT(1) DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`).catch(() => {});

    // Eski tablolara eksik kolon ekle
    await query("ALTER TABLE projects ADD COLUMN path TEXT DEFAULT ''").catch(() => {});

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[SERVER] Backend running on port ${PORT}`);
    });
  } catch (err) {
    console.error("[SERVER] Failed to start:", err.message);
    process.exit(1);
  }
}

start();
