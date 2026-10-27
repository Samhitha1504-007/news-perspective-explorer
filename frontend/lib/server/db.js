// Owner: P1
// Server-only: MySQL connection pool. Settings come from .env.local.
// The app connects as npe_app (see database/mysql/06_db_roles.sql),
// which can read/write rows and CALL procedures but cannot DROP or ALTER.
import mysql from "mysql2/promise";

function createPool() {
  return mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE || "news_perspective_db",
    connectionLimit: 10,
    decimalNumbers: true, // DECIMAL scores come back as numbers, not strings
  });
}

// Reuse one pool across hot reloads in development
const pool = globalThis.__npePool || (globalThis.__npePool = createPool());

// Run one statement with ? placeholders (parameterised: no SQL injection).
export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

// CALL a procedure and return its first result set.
export async function call(procedure, params = []) {
  const placeholders = params.map(() => "?").join(", ");
  const [results] = await pool.query(`CALL ${procedure}(${placeholders})`, params);
  return Array.isArray(results[0]) ? results[0] : [];
}

// For procedures with OUT parameters: the CALL and the SELECT of the
// @variables must run on the same connection.
export async function withConnection(work) {
  const connection = await pool.getConnection();
  try {
    return await work(connection);
  } finally {
    connection.release();
  }
}
