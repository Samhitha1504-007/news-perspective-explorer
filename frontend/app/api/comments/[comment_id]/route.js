// Owner: P1
// P1  DELETE /api/comments/:id  the author or an admin can delete a comment
import { query } from "@/lib/server/db";
import { HttpError, json, requireUser, route, toInt } from "@/lib/server/auth";

export const DELETE = route(async (request, { params }) => {
  const user = requireUser(request);
  const id = toInt(params.comment_id, "comment id");
  const [comment] = await query("SELECT user_id FROM comments WHERE comment_id = ?", [id]);
  if (!comment) throw new HttpError(404, "Comment not found");
  if (comment.user_id !== user.user_id && user.role !== "admin") {
    throw new HttpError(403, "You can only delete your own comments");
  }
  await query("DELETE FROM comments WHERE comment_id = ?", [id]);
  return json({ deleted: true });
});
