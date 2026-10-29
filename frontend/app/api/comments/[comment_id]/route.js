// Owner: P1
// P1  DELETE /api/comments/:id  the author or an admin can delete a comment.
// The check is done in MySQL by sp_delete_comment, with the user id taken
// from the login token (never from the request body).
import { call } from "@/lib/server/db";
import { json, requireUser, route, toInt } from "@/lib/server/auth";

export const DELETE = route(async (request, { params }) => {
  const user = requireUser(request);
  const id = toInt(params.comment_id, "comment id");
  await call("sp_delete_comment", [id, user.user_id]); // SIGNALs if not allowed
  return json({ deleted: true });
});
