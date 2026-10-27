// Owner: P1
// P1  GET /api/follows  topics and sources I follow
import { query } from "@/lib/server/db";
import { json, requireUser, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const user = requireUser(request);
  const topics = await query(
    `SELECT t.topic_id, t.topic_name, f.followed_at
     FROM topic_follows AS f JOIN topics AS t ON t.topic_id = f.topic_id
     WHERE f.user_id = ? ORDER BY t.topic_name`,
    [user.user_id]
  );
  const sources = await query(
    `SELECT s.source_id, s.source_name, f.followed_at
     FROM source_follows AS f JOIN sources AS s ON s.source_id = f.source_id
     WHERE f.user_id = ? ORDER BY s.source_name`,
    [user.user_id]
  );
  return json({ topics, sources });
});
