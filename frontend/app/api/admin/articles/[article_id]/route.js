// Owner: P1
// P1  DELETE /api/admin/articles/:id  (admin only)
// MySQL ON DELETE CASCADE removes topic links, matches, scores, comments,
// bookmarks and feedback; MongoDB documents are removed here.
import { query } from "@/lib/server/db";
import { mongo } from "@/lib/server/mongo";
import { HttpError, json, requireAdmin, route, toInt } from "@/lib/server/auth";

export const DELETE = route(async (request, { params }) => {
  requireAdmin(request);
  const id = toInt(params.article_id, "article id");
  const result = await query("DELETE FROM articles WHERE article_id = ?", [id]);
  if (result.affectedRows === 0) throw new HttpError(404, "Article not found");
  try {
    const db = await mongo();
    await db.collection("article_metadata").deleteMany({ article_id: id });
    await db.collection("reading_history").deleteMany({ article_id: id });
  } catch (err) {
    console.error("MongoDB cleanup failed:", err.message);
  }
  return json({ deleted: id });
});
