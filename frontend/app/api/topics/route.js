// Owner: P1
// P1  GET /api/topics  (public)
import { query } from "@/lib/server/db";
import { json, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const topics = await query(`
    SELECT t.topic_id, t.topic_name, t.description,
           COUNT(DISTINCT at.article_id) AS article_count,
           COUNT(DISTINCT tf.user_id)    AS followers
    FROM topics AS t
    LEFT JOIN article_topics AS at ON at.topic_id = t.topic_id
    LEFT JOIN topic_follows  AS tf ON tf.topic_id = t.topic_id
    GROUP BY t.topic_id, t.topic_name, t.description
    ORDER BY t.topic_name`);
  return json(topics);
});
