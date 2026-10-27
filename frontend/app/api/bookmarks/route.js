// Owner: P1
// P1  GET  /api/bookmarks          my saved articles
//     POST /api/bookmarks {article_id}  save one (saving twice is harmless)
import { query } from "@/lib/server/db";
import { json, readBody, requireUser, route, toInt } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const user = requireUser(request);
  const bookmarks = await query(
    `SELECT d.article_id, d.title, d.published_at, d.source_id, d.source_name, d.topics, d.label, b.saved_at
     FROM bookmarks AS b JOIN v_article_details AS d ON d.article_id = b.article_id
     WHERE b.user_id = ?
     ORDER BY b.saved_at DESC`,
    [user.user_id]
  );
  return json({ bookmarks });
});

export const POST = route(async (request) => {
  const user = requireUser(request);
  const { article_id } = await readBody(request);
  await query(
    `INSERT INTO bookmarks (user_id, article_id) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE saved_at = saved_at`,
    [user.user_id, toInt(article_id, "article id")]
  );
  return json({ bookmarked: true }, 201);
});
