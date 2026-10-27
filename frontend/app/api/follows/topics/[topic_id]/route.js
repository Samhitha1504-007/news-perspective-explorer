// Owner: P1
// P1  POST /api/follows/topics/:id  follow     DELETE  unfollow
import { query } from "@/lib/server/db";
import { json, requireUser, route, toInt } from "@/lib/server/auth";

export const POST = route(async (request, { params }) => {
  const user = requireUser(request);
  await query(
    `INSERT INTO topic_follows (user_id, topic_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE followed_at = followed_at`,
    [user.user_id, toInt(params.topic_id, "topic_id")]
  );
  return json({ following: true }, 201);
});

export const DELETE = route(async (request, { params }) => {
  const user = requireUser(request);
  await query("DELETE FROM topic_follows WHERE user_id = ? AND topic_id = ?", [user.user_id, toInt(params.topic_id, "topic_id")]);
  return json({ following: false });
});
