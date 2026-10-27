// Owner: P1
// P1  POST /api/follows/sources/:id  follow     DELETE  unfollow
import { query } from "@/lib/server/db";
import { json, requireUser, route, toInt } from "@/lib/server/auth";

export const POST = route(async (request, { params }) => {
  const user = requireUser(request);
  await query(
    `INSERT INTO source_follows (user_id, source_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE followed_at = followed_at`,
    [user.user_id, toInt(params.source_id, "source_id")]
  );
  return json({ following: true }, 201);
});

export const DELETE = route(async (request, { params }) => {
  const user = requireUser(request);
  await query("DELETE FROM source_follows WHERE user_id = ? AND source_id = ?", [user.user_id, toInt(params.source_id, "source_id")]);
  return json({ following: false });
});
