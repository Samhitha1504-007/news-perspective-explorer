// Owner: P1
// P1  POST /api/register  -> new reader account (role is always 'reader')
import bcrypt from "bcryptjs";
import { query } from "@/lib/server/db";
import { HttpError, json, readBody, route } from "@/lib/server/auth";

export const POST = route(async (request) => {
  const { name, email, password } = await readBody(request);
  if (!name?.trim() || name.trim().length > 100) throw new HttpError(400, "Enter your name (max 100 characters)");
  if (!email?.trim()) throw new HttpError(400, "Enter an email address");
  if (!password || password.length < 6) throw new HttpError(400, "Password must be at least 6 characters");

  const hash = await bcrypt.hash(password, 10);
  try {
    // trg_users_before_insert lower-cases the email; the CHECK validates its shape
    const result = await query(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'reader')",
      [name, email, hash]
    );
    return json({ user_id: result.insertId, name: name.trim(), role: "reader" }, 201);
  } catch (err) {
    if (err.errno === 1062) throw new HttpError(409, "Email already registered");
    throw err;
  }
});
