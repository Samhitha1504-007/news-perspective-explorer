// Owner: P1 + P2 (shared)
// POST /api/admin/procedures {name, args}  runs one of our stored functions /
// procedures and returns the SQL it ran and the rows it got back.
// Only the routines listed here can be run (no free SQL from the browser).
import { withConnection } from "@/lib/server/db";
import { HttpError, json, readBody, requireAdmin, route } from "@/lib/server/auth";

// name -> the SQL statements to run, in order, on one connection.
// The ? placeholders are filled from args. The last statement's rows are shown.
const ROUTINES = {
  fn_count_term: ["SELECT fn_count_term(?, ?) AS occurrences"],
  fn_article_label: ["SELECT fn_article_label(?) AS label"],
  fn_agreement_pct: ["SELECT fn_agreement_pct(?) AS agreement_pct"],
  sp_score_article: [
    "CALL sp_score_article(?)",
    "SELECT * FROM v_article_scores WHERE article_id = ?",
  ],
  sp_topic_perspective_summary: [
    "CALL sp_topic_perspective_summary(?, @pos, @neu, @crit)",
    "SELECT @pos AS positive, @neu AS neutral, @crit AS critical",
  ],
  sp_user_feed: ["CALL sp_user_feed(?)"],
  sp_change_user_role: ["CALL sp_change_user_role(?, ?)"],
};

export const POST = route(async (request) => {
  requireAdmin(request);
  const { name, args = [] } = await readBody(request);
  const statements = ROUTINES[name];
  if (!statements) throw new HttpError(400, "Unknown procedure or function");

  const rows = await withConnection(async (conn) => {
    let last = [];
    for (const sql of statements) {
      const count = (sql.match(/\?/g) || []).length;
      const [result] = await conn.query(sql, args.slice(0, count));
      // A CALL returns [rows, info]; a SELECT returns rows.
      last = Array.isArray(result[0]) ? result[0] : Array.isArray(result) ? result : [];
    }
    return last;
  });
  return json({ sql: statements, rows });
});
