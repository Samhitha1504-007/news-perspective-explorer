// Owner: P2
// P2  GET /api/compare/:topicId  reads the view v_source_perspective_summary;
// the comparison is logged to MongoDB comparison_sessions.
import { query } from "@/lib/server/db";
import { logQuietly } from "@/lib/server/mongo";
import { HttpError, json, requireUser, route, toInt } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request, { params }) => {
  const user = requireUser(request);
  const id = toInt(params.topic_id, "topic id");
  const [topic] = await query("SELECT topic_id, topic_name FROM topics WHERE topic_id = ?", [id]);
  if (!topic) throw new HttpError(404, "Topic not found");

  const sources = await query(
    `SELECT source_id, source_name, article_count, positive, neutral, critical,
            positive_articles, neutral_articles, critical_articles
     FROM v_source_perspective_summary
     WHERE topic_id = ?
     ORDER BY source_name`,
    [id]
  );

  await logQuietly("comparison_sessions", {
    user_id: user.user_id,
    topic_id: id,
    compared_sources: sources.map((s) => s.source_name),
    timestamp: new Date(),
  });
  return json({ topic_id: id, topic: topic.topic_name, sources });
});
