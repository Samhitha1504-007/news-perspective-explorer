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

  useEffect(() => {
    if (!query) return;
    setError("");
    search(query).then(setResults).catch((err) => setError(err.message));
  }, [query]);

  // Group the articles by source so readers can compare sources side by side:
  // { "Reuters": [article, article], "BBC News": [article], ... }
  const bySource = {};
  for (const article of results?.articles || []) {
    if (!bySource[article.source_name]) bySource[article.source_name] = [];
    bySource[article.source_name].push(article);
  }

  return (
    <main>
      <SearchBar initialQuery={query} />
      {error && <p className="error">{error}</p>}
      {results && (
        <p className="muted">
          {results.count} article(s) for &quot;{results.query}&quot;, grouped by source
        </p>
      )}
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
