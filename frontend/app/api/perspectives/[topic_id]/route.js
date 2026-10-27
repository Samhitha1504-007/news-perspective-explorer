// Owner: P2
// P2  GET /api/perspectives/:topicId  label counts for a topic, from the
// procedure sp_topic_perspective_summary (OUT parameters).
import { query, withConnection } from "@/lib/server/db";
import { HttpError, json, requireUser, route, toInt } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request, { params }) => {
  requireUser(request);
  const id = toInt(params.topic_id, "topic id");
  const [topic] = await query("SELECT topic_name FROM topics WHERE topic_id = ?", [id]);
  if (!topic) throw new HttpError(404, "Topic not found");

  const counts = await withConnection(async (conn) => {
    await conn.query("CALL sp_topic_perspective_summary(?, @pos, @neu, @crit)", [id]);
    const [[row]] = await conn.query("SELECT @pos AS positive, @neu AS neutral, @crit AS critical");
    return row;
  });
  const distribution = {
    positive: Number(counts.positive),
    neutral: Number(counts.neutral),
    critical: Number(counts.critical),
  };
  return json({
    topic_id: id,
    topic: topic.topic_name,
    total_articles: distribution.positive + distribution.neutral + distribution.critical,
    distribution,
  });
});
