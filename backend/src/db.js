const mysql = require("mysql2/promise");
let pool = null;

async function createPool() {
  const config = {
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
    database: process.env.MYSQL_DATABASE || "aiagent_db",
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
