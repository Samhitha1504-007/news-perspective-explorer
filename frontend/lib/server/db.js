// Owner: P1
// Server-only: MySQL connection pools. Settings come from .env.local.
// RBAC: there is one pool per MySQL role (see database/mysql/06_db_roles.sql):
//   admin  -> npe_admin  (admin_role:  read/write everything, run every procedure)
//   reader -> npe_reader (reader_role: read, plus only their own activity rows)
// route() in auth.js picks the pool from the logged-in user's role, so the
// website role and the MySQL role are the same, and MySQL itself refuses
// anything that role is not granted (error 1142).
import mysql from "mysql2/promise";
import { AsyncLocalStorage } from "node:async_hooks";

function createPool(user, password) {
  return mysql.createPool({
    host: process.env.MYSQL_HOST || "localhost",
    port: Number(process.env.MYSQL_PORT || 3306),
    user,
    password,
    database: process.env.MYSQL_DATABASE || "news_perspective_db",
    connectionLimit: 10,
    decimalNumbers: true, // DECIMAL scores come back as numbers, not strings
  });
}

// Reuse the pools across hot reloads in development
const pools =
  globalThis.__npePools ||
  (globalThis.__npePools = {
    admin: createPool(process.env.MYSQL_ADMIN_USER, process.env.MYSQL_ADMIN_PASSWORD),
    reader: createPool(process.env.MYSQL_READER_USER, process.env.MYSQL_READER_PASSWORD),
  });

// Remembers the role of the request being handled ("admin" or "reader").
const currentRole = new AsyncLocalStorage();

// Run work() with every query on the given role's connection.
export function runAsRole(role, work) {
  return currentRole.run(role === "admin" ? "admin" : "reader", work);
}

// Anyone not logged in (login, register, topics) uses the reader account.
function pool() {
  return pools[currentRole.getStore()] || pools.reader;
}

// Run one statement with ? placeholders (parameterised: no SQL injection).
export async function query(sql, params = []) {
  const [rows] = await pool().query(sql, params);
  return rows;
}

// CALL a procedure and return its first result set.
export async function call(procedure, params = []) {
  const placeholders = params.map(() => "?").join(", ");
  const [results] = await pool().query(`CALL ${procedure}(${placeholders})`, params);
  return Array.isArray(results[0]) ? results[0] : [];
}

// For procedures with OUT parameters: the CALL and the SELECT of the
// @variables must run on the same connection.
export async function withConnection(work) {
  const connection = await pool().getConnection();
  try {
    return await work(connection);
  } finally {
    connection.release();
  }
}
