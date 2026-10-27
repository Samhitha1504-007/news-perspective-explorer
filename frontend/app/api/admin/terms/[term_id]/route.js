// Owner: P2
// P2  PUT    /api/admin/terms/:id  {term?, category_id?, weight?}
//     DELETE /api/admin/terms/:id
// trg_terms_after_update / trg_terms_before_delete adjust every affected
// score in SQL using OLD and NEW.
import { query } from "@/lib/server/db";
import { HttpError, json, readBody, requireAdmin, route, toInt } from "@/lib/server/auth";

async function matchedCount(termId) {
  const [{ n }] = await query("SELECT COUNT(*) AS n FROM term_matches WHERE term_id = ?", [termId]);
  return n;
}

export const PUT = route(async (request, { params }) => {
  requireAdmin(request);
  const id = toInt(params.term_id, "term id");
  const body = await readBody(request);
  const sets = [];
  const values = [];
  if (body.term !== undefined) { sets.push("term = ?"); values.push(String(body.term)); }
  if (body.category_id !== undefined) { sets.push("category_id = ?"); values.push(Number(body.category_id)); }
  if (body.weight !== undefined) { sets.push("weight = ?"); values.push(Number(body.weight)); }
  if (!sets.length) throw new HttpError(400, "Nothing to change");

  const before = await matchedCount(id);
  let result;
  try {
    result = await query(`UPDATE perspective_terms SET ${sets.join(", ")} WHERE term_id = ?`, [...values, id]);
  } catch (err) {
    if (err.errno === 1062) throw new HttpError(409, "That term already exists");
    throw err;
  }
  if (result.affectedRows === 0) throw new HttpError(404, "Term not found");
  return json({ term_id: id, rescored_count: Math.max(before, await matchedCount(id)) });
});

export const DELETE = route(async (request, { params }) => {
  requireAdmin(request);
  const id = toInt(params.term_id, "term id");
  const affected = await matchedCount(id);
  const result = await query("DELETE FROM perspective_terms WHERE term_id = ?", [id]);
  if (result.affectedRows === 0) throw new HttpError(404, "Term not found");
  return json({ deleted: id, rescored_count: affected });
});
