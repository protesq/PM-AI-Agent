const mysql = require("mysql2/promise");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

function makeResult(data) {
  return { success: true, data, error: null, timestamp: new Date().toISOString() };
}
function makeError(msg) {
  return { success: false, data: null, error: String(msg), timestamp: new Date().toISOString() };
}

// Root bağlantısı — database belirtmeden bağlan
async function getAdminConn() {
  return mysql.createConnection({
    host: process.env.MYSQL_HOST || "localhost",
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    user: process.env.MYSQL_USER || "root",
    password: process.env.MYSQL_PASSWORD || "",
  });
}

// ── Veritabanı oluştur ───────────────────────────────────────────────────────
async function createDatabase(db_name) {
  if (!db_name || !/^[a-zA-Z0-9_]+$/.test(db_name))
    return makeError("Geçersiz veritabanı adı (sadece harf, rakam, alt çizgi)");
  let conn;
  try {
    conn = await getAdminConn();
    await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${db_name}\``);
    return makeResult({ created: db_name });
  } catch (err) {
    return makeError(err.message);
  } finally {
    conn?.end();
  }
}

// ── SQL çalıştır (herhangi bir veritabanında) ────────────────────────────────
async function runSQL(database, sql) {
  if (!sql) return makeError("SQL boş");
  let conn;
  try {
    conn = await getAdminConn();
    if (database) await conn.query(`USE \`${database}\``);
    const [rows] = await conn.query(sql);
    return makeResult(rows);
  } catch (err) {
    return makeError(err.message);
  } finally {
    conn?.end();
  }
}

// ── Birden fazla SQL ifadesi çalıştır (schema dump gibi) ─────────────────────
async function runSQLBatch(database, sqlBatch) {
  if (!sqlBatch) return makeError("SQL boş");
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || "localhost",
      port: parseInt(process.env.MYSQL_PORT) || 3306,
      user: process.env.MYSQL_USER || "root",
      password: process.env.MYSQL_PASSWORD || "",
      database: database || undefined,
      multipleStatements: true,
    });
    const [rows] = await conn.query(sqlBatch);
    return makeResult({ executed: true, info: Array.isArray(rows) ? rows.length + " ifade" : "ok" });
  } catch (err) {
    return makeError(err.message);
  } finally {
    conn?.end();
  }
}

// ── Veritabanlarını listele ──────────────────────────────────────────────────
async function listDatabases() {
  let conn;
  try {
    conn = await getAdminConn();
    const [rows] = await conn.execute("SHOW DATABASES");
    const dbs = rows.map(r => Object.values(r)[0]);
    return makeResult(dbs);
  } catch (err) {
    return makeError(err.message);
  } finally {
    conn?.end();
  }
}

// ── Tabloları listele ────────────────────────────────────────────────────────
async function listTables(database) {
  if (!database) return makeError("Veritabanı adı gerekli");
  let conn;
  try {
    conn = await getAdminConn();
    await conn.execute(`USE \`${database}\``);
    const [rows] = await conn.execute("SHOW TABLES");
    const tables = rows.map(r => Object.values(r)[0]);
    return makeResult(tables);
  } catch (err) {
    return makeError(err.message);
  } finally {
    conn?.end();
  }
}

// ── MySQL bağlantı bilgilerini güncelle (.env dosyasına yaz) ─────────────────
async function updateMysqlCredentials({ host, port, user, password, database }) {
  const fs = require("fs");
  const envPath = path.join(__dirname, "../../.env");
  try {
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
    const set = (key, val) => {
      if (val === undefined || val === null) return;
      const re = new RegExp(`^${key}=.*$`, "m");
      if (re.test(content)) {
        content = content.replace(re, `${key}=${val}`);
      } else {
        content += `\n${key}=${val}`;
      }
    };
    if (host) set("MYSQL_HOST", host);
    if (port) set("MYSQL_PORT", port);
    if (user) set("MYSQL_USER", user);
    if (password) set("MYSQL_PASSWORD", password);
    if (database) set("MYSQL_DATABASE", database);
    fs.writeFileSync(envPath, content, "utf8");
    return makeResult({ updated: true, note: "Backend'i yeniden başlatman gerekiyor (nodemon otomatik yapar)" });
  } catch (err) {
    return makeError(err.message);
  }
}

module.exports = { createDatabase, runSQL, runSQLBatch, listDatabases, listTables, updateMysqlCredentials };
