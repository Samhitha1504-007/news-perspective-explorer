"use client";
// Owner: P1
import { useEffect, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import SearchBar from "@/components/SearchBar";
import { search } from "@/lib/api";

// Next.js passes the URL's ?query=... in as searchParams
export default function SearchResultsPage({ searchParams }) {
  const query = searchParams.query || "";
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [labelFilter, setLabelFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");

  useEffect(() => {
    if (!query) return;
    setError("");
    setLabelFilter("All");
    setSourceFilter("All");
    search(query).then(setResults).catch((err) => setError(err.message));
  }, [query]);

  const allArticles = results?.articles || [];

  // Source names for the dropdown, taken from the results themselves
  const sourceNames = [...new Set(allArticles.map((article) => article.source_name))].sort();

  // Filters run in the browser on the results we already have
  const shown = allArticles.filter(
    (article) =>
      (labelFilter === "All" || article.label === labelFilter) &&
      (sourceFilter === "All" || article.source_name === sourceFilter)
  );

  // Group the articles by source so readers can compare sources side by side:
  // { "Reuters": [article, article], "BBC News": [article], ... }
  const bySource = {};
  for (const article of shown) {
    if (!bySource[article.source_name]) bySource[article.source_name] = [];
    bySource[article.source_name].push(article);
  }

  return (
    <main>
      <SearchBar initialQuery={query} />
      {error && <p className="error">{error}</p>}

      {results && (
        <div className="filters">
          <label>
            Perspective{" "}
            <select value={labelFilter} onChange={(e) => setLabelFilter(e.target.value)}>
              <option>All</option>
              <option>Positive</option>
              <option>Neutral</option>
              <option>Critical</option>
            </select>
          </label>
          <label>
            Source{" "}
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
              <option>All</option>
              {sourceNames.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <span className="muted">
            Showing {shown.length} of {results.count} article(s) for &quot;{results.query}&quot;
          </span>
        </div>
      )}

      {results && shown.length === 0 && <p>No articles match these filters.</p>}

      {Object.entries(bySource).map(([sourceName, articles]) => (
        <section key={sourceName}>
          <h2 className="section-title">{sourceName} · {articles.length}</h2>
          {articles.map((article) => (
            <ArticleCard key={article.article_id} article={article} />
          ))}
        </section>
      ))}
    </main>
  );
}
