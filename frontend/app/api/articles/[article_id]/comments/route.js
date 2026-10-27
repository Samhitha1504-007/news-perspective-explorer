// Owner: P1
// P1  GET  /api/articles/:id/comments   all comments, newest first
//     POST /api/articles/:id/comments   add a comment {body}
import { query } from "@/lib/server/db";
import { HttpError, json, readBody, requireUser, route, toInt } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

async function listComments(articleId) {
  return query(
    `SELECT c.comment_id, c.body, c.created_at, c.user_id, u.name
     FROM comments AS c JOIN users AS u ON u.user_id = c.user_id
     WHERE c.article_id = ?
     ORDER BY c.created_at DESC, c.comment_id DESC`,
    [articleId]
  );
}

export const GET = route(async (request, { params }) => {
  requireUser(request);
  return json({ comments: await listComments(toInt(params.article_id, "article id")) });
});

export const POST = route(async (request, { params }) => {
  const user = requireUser(request);
  const id = toInt(params.article_id, "article id");
  const { body } = await readBody(request);
  if (typeof body !== "string" || body.length > 1000) {
    throw new HttpError(400, "A comment must be text of at most 1000 characters");
  }
  // trg_comments_before_insert trims it; CHECK chk_comments_body rejects a blank one
  const result = await query(
    "INSERT INTO comments (article_id, user_id, body) VALUES (?, ?, ?)",
    [id, user.user_id, body]
  );
  return json({ comment_id: result.insertId, comments: await listComments(id) }, 201);
});
