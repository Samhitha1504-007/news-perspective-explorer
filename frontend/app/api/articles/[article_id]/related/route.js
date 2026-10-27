// Owner: P1
// P1  GET /api/articles/:id/related  other articles on the same topics
// (self-join on article_topics)
import { query } from "@/lib/server/db";
import { json, requireUser, route, toInt } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request, { params }) => {
  requireUser(request);
  const id = toInt(params.article_id, "article id");
  const related = await query(
    `SELECT DISTINCT d.article_id, d.title, d.published_at, d.source_id, d.source_name, d.topics, d.label
     FROM article_topics AS mine
     JOIN article_topics AS other
       ON other.topic_id = mine.topic_id AND other.article_id <> mine.article_id
     JOIN v_article_details AS d ON d.article_id = other.article_id
     WHERE mine.article_id = ?
     ORDER BY d.published_at DESC
     LIMIT 6`,
    [id]
  );
  return json({ related });
});
