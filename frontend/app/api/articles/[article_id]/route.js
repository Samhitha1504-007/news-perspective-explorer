// Owner: P1
// P1  GET /api/articles/:id  article + source + topics + this reader's
// bookmark / follow / feedback state
import { query } from "@/lib/server/db";
import { HttpError, json, requireUser, route, toInt } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request, { params }) => {
  const user = requireUser(request);
  const id = toInt(params.article_id, "article id");

  const [article] = await query(
    `SELECT a.article_id, a.title, a.url, a.published_at, a.summary, a.content,
            s.source_id, s.source_name, s.website,
            fn_article_label(a.article_id) AS label,
            fn_reading_time(a.article_id) AS reading_minutes,
            EXISTS(SELECT 1 FROM bookmarks b WHERE b.user_id = ? AND b.article_id = a.article_id) AS bookmarked,
            EXISTS(SELECT 1 FROM source_follows f WHERE f.user_id = ? AND f.source_id = a.source_id) AS following_source
     FROM articles AS a
     JOIN sources AS s ON s.source_id = a.source_id
     WHERE a.article_id = ?`,
    [user.user_id, user.user_id, id]
  );
  if (!article) throw new HttpError(404, "Article not found");

  const topics = await query(
    `SELECT t.topic_id, t.topic_name,
            EXISTS(SELECT 1 FROM topic_follows f WHERE f.user_id = ? AND f.topic_id = t.topic_id) AS following
     FROM article_topics AS at JOIN topics AS t ON t.topic_id = at.topic_id
     WHERE at.article_id = ? ORDER BY t.topic_name`,
    [user.user_id, id]
  );

  const [feedback] = await query(
    `SELECT v.votes, v.agree_count, v.disagree_count, v.agreement_pct,
            lf.vote AS my_vote, lf.suggested_label AS my_suggestion
     FROM v_article_feedback AS v
     LEFT JOIN label_feedback AS lf ON lf.article_id = v.article_id AND lf.user_id = ?
     WHERE v.article_id = ?`,
    [user.user_id, id]
  );

  const { source_id, source_name, website, bookmarked, following_source, ...rest } = article;
  return json({
    ...rest,
    source: { source_id, source_name, website },
    topics: topics.map((t) => ({ ...t, following: Boolean(t.following) })),
    bookmarked: Boolean(bookmarked),
    following_source: Boolean(following_source),
    feedback,
  });
});
