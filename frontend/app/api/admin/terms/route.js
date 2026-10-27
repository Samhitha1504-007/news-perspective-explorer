// Owner: P2
// P2  GET  /api/admin/terms  all terms (admin only)
//     POST /api/admin/terms  {term, category_id, weight}
// trg_terms_after_insert counts the new term in every article and updates
// the scores; nothing is recalculated here.
import { query } from "@/lib/server/db";
import { HttpError, json, readBody, requireAdmin, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  requireAdmin(request);
  const terms = await query(`
    SELECT t.term_id, t.term, t.category_id, pc.category_name, t.weight,
           (SELECT COUNT(*) FROM term_matches tm WHERE tm.term_id = t.term_id) AS articles_matched
    FROM perspective_terms AS t
    JOIN perspective_categories AS pc ON pc.category_id = t.category_id
    ORDER BY pc.category_name, t.term`);
  return json(terms);
});

export const POST = route(async (request) => {
  requireAdmin(request);
  const { term, category_id, weight } = await readBody(request);
  if (!term?.trim()) throw new HttpError(400, "Enter a term");
  try {
    const result = await query(
      "INSERT INTO perspective_terms (term, category_id, weight) VALUES (?, ?, ?)",
      [term, Number(category_id), Number(weight)]
    );
    const [{ n }] = await query("SELECT COUNT(*) AS n FROM term_matches WHERE term_id = ?", [result.insertId]);
    return json({ term_id: result.insertId, rescored_count: n }, 201);
  } catch (err) {
    if (err.errno === 1062) throw new HttpError(409, "That term already exists");
    throw err;
  }
});
