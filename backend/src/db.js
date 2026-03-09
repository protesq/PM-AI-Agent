const path = require("path");

// USE_SQLITE=true → lokal SQLite dosyası (kurulum gerektirmez)
// USE_SQLITE olmadan → MySQL (Docker/production)
const USE_SQLITE = process.env.USE_SQLITE === "true";

// ── SQLite modu ──────────────────────────────────────────────────────────────
if (USE_SQLITE) {
  const Database = require("better-sqlite3");
  const dbPath = path.join(__dirname, "../../local.db");
  const db = new Database(dbPath);

  // WAL modu → daha hızlı concurrent okuma
  db.pragma("journal_mode = WAL");

  // Tabloları oluştur (yoksa)
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'todo',
      assigned_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER,
      content TEXT,
      created_by_agent INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `);

  console.log(`[DB] SQLite modu aktif → ${dbPath}`);

  async function query(sql, params = []) {
    const stmt = db.prepare(sql);
    const upper = sql.trim().toUpperCase();
    if (upper.startsWith("SELECT") || upper.startsWith("WITH")) {
      return stmt.all(...(params || []));
    } else {
      const result = stmt.run(...(params || []));
      // MySQL2 ile aynı arayüz: insertId, affectedRows
      return { insertId: result.lastInsertRowid, affectedRows: result.changes };
    }
  }

  module.exports = {
    createPool: async () => console.log("[DB] SQLite hazır, pool gerekmez."),
    query,
  };

// ── MySQL modu ───────────────────────────────────────────────────────────────
} else {
  const mysql = require("mysql2/promise");
  let pool = null;

  async function createPool() {
    const config = {
      host: process.env.MYSQL_HOST || "db",
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || "admin",
      password: process.env.MYSQL_PASSWORD || "secret",
      database: process.env.MYSQL_DATABASE || "projectdb",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    };

    const maxRetries = 10;
    const retryDelay = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[DB] MySQL bağlantı denemesi ${attempt}/${maxRetries}...`);
        pool = mysql.createPool(config);
        const conn = await pool.getConnection();
        conn.release();
        console.log("[DB] MySQL bağlantısı başarılı.");
        return pool;
      } catch (err) {
        console.error(`[DB] Deneme ${attempt} başarısız: ${err.message}`);
        if (attempt === maxRetries) {
          throw new Error(`[DB] ${maxRetries} denemeden sonra bağlanılamadı.`);
        }
        await new Promise((r) => setTimeout(r, retryDelay));
      }
    }
  }

  async function query(sql, params = []) {
    if (!pool) throw new Error("[DB] Pool başlatılmadı.");
    const [rows] = await pool.execute(sql, params);
    return rows;
  }

  module.exports = { createPool, query };
}
