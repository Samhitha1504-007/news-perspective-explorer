// Owner: P2
// P1/P2  GET /api/admin/stats  (admin only)
// MySQL: scalar subqueries, GROUP BY, a CTE with RANK(); MongoDB: aggregations.
import { query } from "@/lib/server/db";
import { mongo } from "@/lib/server/mongo";
import { json, requireAdmin, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  requireAdmin(request);

  const [totals] = await query(`
    SELECT (SELECT COUNT(*) FROM users)          AS users,
           (SELECT COUNT(*) FROM articles)       AS articles,
           (SELECT COUNT(*) FROM sources)        AS sources,
           (SELECT COUNT(*) FROM topics)         AS topics,
           (SELECT COUNT(*) FROM comments)       AS comments,
           (SELECT COUNT(*) FROM bookmarks)      AS bookmarks,
           (SELECT COUNT(*) FROM label_feedback) AS feedback`);

  const bySource = await query(`
    SELECT source_name, COUNT(*) AS articles,
           SUM(label = 'Positive') AS positive,
           SUM(label = 'Neutral')  AS neutral,
           SUM(label = 'Critical') AS critical
    FROM v_article_details
    GROUP BY source_id, source_name
    ORDER BY source_name`);

  // CTE + window function: most-bookmarked articles, ranked
  const mostSaved = await query(`
    WITH saves AS (
      SELECT article_id, COUNT(*) AS saves FROM bookmarks GROUP BY article_id
    )
    SELECT d.article_id, d.title, s.saves, RANK() OVER (ORDER BY s.saves DESC) AS rnk
    FROM saves AS s JOIN v_article_details AS d ON d.article_id = s.article_id
    ORDER BY rnk LIMIT 5`);

  const disputed = await query(`
    SELECT d.article_id, d.title, d.label, f.votes, f.agreement_pct
    FROM v_article_feedback AS f JOIN v_article_details AS d ON d.article_id = f.article_id
    WHERE f.votes > 0
    ORDER BY f.agreement_pct ASC, f.votes DESC LIMIT 5`);

  let mongoStats = { searches: 0, article_views: 0, top_searches: [], most_viewed: [], mongo_ok: true };
  try {
    const db = await mongo();
    const topSearches = await db.collection("search_logs").aggregate([
      { $group: { _id: { $toLower: "$query" }, times: { $sum: 1 } } },
      { $sort: { times: -1 } },
      { $limit: 5 },
      { $project: { _id: 0, query: "$_id", times: 1 } },
    ]).toArray();
    const viewed = await db.collection("reading_history").aggregate([
      { $match: { event_type: "view" } },
      { $group: { _id: "$article_id", views: { $sum: 1 } } },
      { $sort: { views: -1 } },
      { $limit: 5 },
    ]).toArray();
    const ids = viewed.map((v) => v._id);
    const titles = {};
    if (ids.length) {
      for (const r of await query("SELECT article_id, title FROM articles WHERE article_id IN (?)", [ids])) {
        titles[r.article_id] = r.title;
      }
    }
    mongoStats = {
      searches: await db.collection("search_logs").countDocuments(),
      article_views: await db.collection("reading_history").countDocuments({ event_type: "view" }),
      top_searches: topSearches,
      most_viewed: viewed.map((v) => ({ article_id: v._id, views: v.views, title: titles[v._id] || "Deleted article" })),
      mongo_ok: true,
    };
  } catch {
    mongoStats.mongo_ok = false;
  }

  return json({
    totals: { ...totals, searches: mongoStats.searches, article_views: mongoStats.article_views },
    by_source: bySource,
    most_saved: mostSaved,
    disputed,
    top_searches: mongoStats.top_searches,
    most_viewed: mongoStats.most_viewed,
    mongo_ok: mongoStats.mongo_ok,
  });
});
