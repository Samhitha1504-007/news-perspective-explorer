// Owner: P1
// P1  GET  /api/bookmarks          my saved articles
//     POST /api/bookmarks {article_id}  Save button: save, or unsave if already saved
import { query, withConnection } from "@/lib/server/db";
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

// The Save button: sp_toggle_bookmark saves or unsaves and returns the
// new state in its OUT parameter (read back on the same connection).
export const POST = route(async (request) => {
  const user = requireUser(request);
  const { article_id } = await readBody(request);
  const saved = await withConnection(async (conn) => {
    await conn.query("CALL sp_toggle_bookmark(?, ?, @saved)", [user.user_id, toInt(article_id, "article id")]);
    const [[row]] = await conn.query("SELECT @saved AS saved");
    return row.saved;
  });
  return json({ bookmarked: saved === 1 });
});
