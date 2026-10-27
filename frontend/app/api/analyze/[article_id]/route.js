// Owner: P2
// P2  GET /api/analyze/:id  label, the three scores and the matched terms.
// Everything is computed in SQL (sp_compute_scores via triggers); this
// route only reads the results.
import { call, query } from "@/lib/server/db";
import { HttpError, json, requireUser, route, toInt } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request, { params }) => {
  requireUser(request);
  const id = toInt(params.article_id, "article id");

  let [scores] = await query(
    "SELECT positive, neutral, critical, scored_at FROM v_article_scores WHERE article_id = ?",
    [id]
  );
  if (!scores) {
    await call("sp_score_article", [id]); // SIGNALs 'Article not found' for a bad id
    [scores] = await query(
      "SELECT positive, neutral, critical, scored_at FROM v_article_scores WHERE article_id = ?",
      [id]
    );
  }
  if (!scores) throw new HttpError(404, "Article not found");

  const [{ label }] = await query("SELECT fn_article_label(?) AS label", [id]);
  const matched = await query(
    `SELECT t.term, pc.category_name AS category, tm.occurrences AS count, t.weight,
            tm.occurrences * t.weight AS contribution
     FROM term_matches AS tm
     JOIN perspective_terms AS t       ON t.term_id = tm.term_id
     JOIN perspective_categories AS pc ON pc.category_id = t.category_id
     WHERE tm.article_id = ?
     ORDER BY contribution DESC, t.term`,
    [id]
  );
  return json({
    article_id: id,
    label,
    scores: { positive: scores.positive, neutral: scores.neutral, critical: scores.critical },
    scored_at: scores.scored_at,
    matched_terms: matched,
  });
});
