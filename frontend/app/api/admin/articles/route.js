// Owner: P1
// P1  POST /api/admin/articles  add an article (admin only).
// 1. MySQL: sp_add_article inserts article + topics in one transaction;
//    its insert trigger scores the article in the same transaction.
// 2. MongoDB: keywords. MySQL and MongoDB cannot share a transaction, so
//    if this fails the article is deleted again (compensating action).
import { query, withConnection } from "@/lib/server/db";
import { mongo } from "@/lib/server/mongo";
import { saveMetadata } from "@/lib/server/keywords";
import { HttpError, json, readBody, requireAdmin, route } from "@/lib/server/auth";

export const POST = route(async (request) => {
  requireAdmin(request);
  const b = await readBody(request);
  const topicIds = [...new Set((b.topic_ids || []).map(Number))].filter((n) => Number.isInteger(n) && n > 0);
  if (!b.title?.trim()) throw new HttpError(400, "Title is required");
  if (!b.content?.trim()) throw new HttpError(400, "Article text is required");
  if (!b.published_at) throw new HttpError(400, "Publication date is required");
  if (!topicIds.length) throw new HttpError(400, "Choose at least one topic");

  const articleId = await withConnection(async (conn) => {
    await conn.query("CALL sp_add_article(?, ?, ?, ?, ?, ?, ?, @new_id)", [
      Number(b.source_id), b.title, b.url || "", b.published_at, b.summary || null, b.content,
      topicIds.join(","),
    ]);
    const [[row]] = await conn.query("SELECT @new_id AS id");
    return row.id;
  });

  try {
    await saveMetadata(await mongo(), articleId, b.content);
  } catch (err) {
    await query("DELETE FROM articles WHERE article_id = ?", [articleId]);
    throw new HttpError(503, "Could not save keywords to MongoDB, so the article was not kept");
  }

  const [{ label }] = await query("SELECT fn_article_label(?) AS label", [articleId]);
  return json({ article_id: articleId, label }, 201);
});
