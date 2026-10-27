// Owner: P1
// P1  DELETE /api/bookmarks/:articleId  remove a saved article
import { query } from "@/lib/server/db";
import { json, requireUser, route, toInt } from "@/lib/server/auth";

export const DELETE = route(async (request, { params }) => {
  const user = requireUser(request);
  await query("DELETE FROM bookmarks WHERE user_id = ? AND article_id = ?", [
    user.user_id,
    toInt(params.article_id, "article id"),
  ]);
  return json({ bookmarked: false });
});
