"use client";
// Owner: P2
// Admin dashboard. Numbers come from GET /admin/stats, which combines
// MySQL (counts, GROUP BY) and MongoDB (aggregations on logs).
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStats } from "@/lib/api";

export default function AdminStatsPage() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStats().then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <main><p className="error">{error}</p></main>;
  if (!stats) return <main><p>Loading...</p></main>;

  const totals = [
    ["Users", stats.totals.users],
    ["Articles", stats.totals.articles],
    ["Sources", stats.totals.sources],
    ["Topics", stats.totals.topics],
    ["Comments", stats.totals.comments],
    ["Bookmarks", stats.totals.bookmarks],
    ["Label votes", stats.totals.feedback],
    ["Searches", stats.totals.searches],
    ["Article views", stats.totals.article_views],
  ];

  return (
    <main>
      <p className="kicker">Admin</p>
      <h1>Statistics</h1>
      <p className="lede">Counts from MySQL and activity from MongoDB.</p>

      <div className="grid stat-grid">
        {totals.map(([name, value]) => (
          <div key={name} className="stat">
            <div className="muted">{name}</div>
            <div className="number">{value}</div>
          </div>
        ))}
      </div>

      <h2 className="section-title">Articles per source by label (MySQL GROUP BY on a view)</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Source</th><th>Articles</th><th>Positive</th><th>Neutral</th><th>Critical</th></tr>
          </thead>
          <tbody>
            {stats.by_source.map((row) => (
              <tr key={row.source_name}>
                <td>{row.source_name}</td>
                <td>{row.articles}</td>
                <td>{row.positive}</td>
                <td>{row.neutral}</td>
                <td>{row.critical}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!stats.mongo_ok && <p className="error">MongoDB is not reachable, so search and view statistics are empty.</p>}

      <div className="two-columns">
        <section>
          <h2 className="section-title">Most saved (CTE + RANK)</h2>
          {stats.most_saved.length === 0 ? <p className="muted">No bookmarks yet.</p> : (
            <ol>
              {stats.most_saved.map((row) => (
                <li key={row.article_id}>
                  <Link href={`/articles/${row.article_id}`}>{row.title}</Link>
                  <span className="muted"> · {row.saves} save(s), rank {row.rnk}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section>
          <h2 className="section-title">Most disputed labels</h2>
          {stats.disputed.length === 0 ? <p className="muted">No reader votes yet.</p> : (
            <ol>
              {stats.disputed.map((row) => (
                <li key={row.article_id}>
                  <Link href={`/articles/${row.article_id}`}>{row.title}</Link>
                  <span className="muted"> · {row.label}, {row.agreement_pct}% agree ({row.votes} vote(s))</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      <div className="two-columns">
        <section>
          <h2 className="section-title">Top searches (MongoDB)</h2>
          {stats.top_searches.length === 0 ? <p className="muted">No searches yet.</p> : (
            <ol>
              {stats.top_searches.map((row) => (
                <li key={row.query}>
                  <Link href={`/search?query=${encodeURIComponent(row.query)}`}>{row.query}</Link>
                  <span className="muted"> · {row.times} time(s)</span>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section>
          <h2 className="section-title">Most viewed articles (MongoDB)</h2>
          {stats.most_viewed.length === 0 ? <p className="muted">No article views yet.</p> : (
            <ol>
              {stats.most_viewed.map((row) => (
                <li key={row.article_id}>
                  <Link href={`/articles/${row.article_id}`}>{row.title}</Link>
                  <span className="muted"> · {row.views} view(s)</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
