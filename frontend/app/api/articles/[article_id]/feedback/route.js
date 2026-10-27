// Owner: P2
// P2  PUT    /api/articles/:id/feedback  {vote: 'agree'|'disagree', suggested_label?}
//     DELETE /api/articles/:id/feedback  remove my vote
// The rules live in sp_set_feedback and the CHECK on label_feedback.
import { call, query } from "@/lib/server/db";
import { json, readBody, requireUser, route, toInt } from "@/lib/server/auth";

async function summary(userId, articleId) {
  const [row] = await query(
    `SELECT v.votes, v.agree_count, v.disagree_count, v.agreement_pct,
            lf.vote AS my_vote, lf.suggested_label AS my_suggestion
     FROM v_article_feedback AS v
     LEFT JOIN label_feedback AS lf ON lf.article_id = v.article_id AND lf.user_id = ?
     WHERE v.article_id = ?`,
    [userId, articleId]
  );
  return row;
}

export const PUT = route(async (request, { params }) => {
  const user = requireUser(request);
  const id = toInt(params.article_id, "article id");
  const { vote, suggested_label } = await readBody(request);
  await call("sp_set_feedback", [user.user_id, id, vote ?? "", suggested_label || null]);
  return json(await summary(user.user_id, id));
});

export const DELETE = route(async (request, { params }) => {
  const user = requireUser(request);
  const id = toInt(params.article_id, "article id");
  await query("DELETE FROM label_feedback WHERE user_id = ? AND article_id = ?", [user.user_id, id]);
  return json(await summary(user.user_id, id));
});
