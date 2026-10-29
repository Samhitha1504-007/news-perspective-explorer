// Owner: P1
// P1  GET /api/admin/users  every user with how active they are
//     PUT /api/admin/users {email, role}  make someone admin or reader,
//         through the procedure sp_change_user_role (it checks the role
//         and the email and SIGNALs an error if either is wrong)
import { call, query } from "@/lib/server/db";
import { json, readBody, requireAdmin, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  requireAdmin(request);
  const users = await query(
    `SELECT u.user_id, u.name, u.email, u.role, u.created_at,
            (SELECT COUNT(*) FROM comments  c WHERE c.user_id = u.user_id) AS comments,
            (SELECT COUNT(*) FROM bookmarks b WHERE b.user_id = u.user_id) AS bookmarks
     FROM users AS u ORDER BY u.user_id`
  );
  return json({ users });
});

export const PUT = route(async (request) => {
  requireAdmin(request);
  const { email, role } = await readBody(request);
  const [user] = await call("sp_change_user_role", [email, role]);
  return json({ user });
});
