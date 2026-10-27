// Owner: P1
// Server-only: login tokens, role checks and error responses.
//
// 1. /api/register stores a bcrypt HASH of the password.
// 2. /api/login checks it and returns a signed JWT {user_id, role}.
// 3. The browser sends it back on every request: Authorization: Bearer <token>
// 4. requireUser() / requireAdmin() verify it here, in the API, so hiding a
//    button in the UI is never what protects data.
// 5. route() also runs the request on the MySQL account of the same role
//    (npe_admin / npe_reader), so the database enforces the role as well.
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { runAsRole } from "./db";

const SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export class HttpError extends Error {
  constructor(status, detail) {
    super(detail);
    this.status = status;
  }
}

export function createToken(user) {
  return jwt.sign({ user_id: user.user_id, role: user.role }, SECRET, { expiresIn: "24h" });
}

export function getUser(request) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(header.slice(7), SECRET);
    return { user_id: payload.user_id, role: payload.role };
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

export function requireUser(request) {
  const user = getUser(request);
  if (!user) throw new HttpError(401, "Login required");
  return user;
}

export function requireAdmin(request) {
  const user = requireUser(request);
  if (user.role !== "admin") throw new HttpError(403, "Admin only");
  return user;
}

export function json(data, status = 200) {
  return NextResponse.json(data, { status });
}

// Turn MySQL errors into clear HTTP answers, so the message from a
// SIGNAL, CHECK, UNIQUE or FOREIGN KEY rule reaches the page.
function toResponse(err) {
  if (err instanceof HttpError) return json({ detail: err.message }, err.status);
  switch (err.errno) {
    case 1644: // SIGNAL SQLSTATE '45000' from a procedure or trigger
      return json({ detail: err.sqlMessage }, 400);
    case 3819: // CHECK constraint
      return json({ detail: `Rejected by the database: ${err.sqlMessage}` }, 400);
    case 1062: // UNIQUE
      return json({ detail: "That already exists" }, 409);
    case 1452: // FK: referenced row missing
      return json({ detail: "Referenced item does not exist" }, 400);
    case 1451: // FK RESTRICT: still referenced
      return json({ detail: "Cannot delete: other rows still use it" }, 409);
    case 1142: // privilege missing (e.g. after REVOKE in the demo)
      return json({ detail: `Database permission denied: ${err.sqlMessage}` }, 403);
    default:
      console.error(err);
      return json({ detail: "Server error" }, 500);
  }
}

// Website role -> MySQL role. A bad token falls back to reader; the
// handler's requireUser() then answers 401.
function dbRole(request) {
  try {
    return getUser(request)?.role === "admin" ? "admin" : "reader";
  } catch {
    return "reader";
  }
}

// Wrap every route handler: run it on the MySQL role of the logged-in
// user and convert any error to JSON.
export function route(handler) {
  return async (request, context) => {
    try {
      return await runAsRole(dbRole(request), () => handler(request, context));
    } catch (err) {
      return toResponse(err);
    }
  };
}

export function toInt(value, name = "id") {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Invalid ${name}`);
  return n;
}

export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
}
