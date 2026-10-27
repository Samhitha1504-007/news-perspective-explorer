// Owner: P1
// P2  GET /api/sources  (public)
import { query } from "@/lib/server/db";
import { json, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const sources = await query(`
    SELECT s.source_id, s.source_name, s.website, s.country, s.description,
           COUNT(DISTINCT a.article_id) AS article_count,
           COUNT(DISTINCT sf.user_id)   AS followers
    FROM sources AS s
    LEFT JOIN articles       AS a  ON a.source_id = s.source_id
    LEFT JOIN source_follows AS sf ON sf.source_id = s.source_id
    GROUP BY s.source_id, s.source_name, s.website, s.country, s.description
    ORDER BY s.source_name`);
  return json({ sources });
});
