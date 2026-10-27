// Owner: P1
// P1  POST /api/login  -> signed token with user_id and role
import bcrypt from "bcryptjs";
import { query } from "@/lib/server/db";
import { createToken, HttpError, json, readBody, route } from "@/lib/server/auth";

export const POST = route(async (request) => {
  const { email, password } = await readBody(request);
  const [user] = await query(
    "SELECT user_id, name, password_hash, role FROM users WHERE email = LOWER(TRIM(?))",
    [email || ""]
  );
  // Same message for a wrong email or a wrong password: does not reveal which emails exist
  if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
    throw new HttpError(401, "Wrong email or password");
  }
  return json({ token: createToken(user), user_id: user.user_id, name: user.name, role: user.role });
});
