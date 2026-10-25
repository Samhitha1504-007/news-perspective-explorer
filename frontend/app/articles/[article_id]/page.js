"use client";
// Owner: P1 (title, source, content) + P2 (perspective panel)
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate } from "@/components/ArticleCard";
import { addHistory, getArticle, getKeywords, getSession } from "@/lib/api";

export default function ArticlePage({ params }) {
  const articleId = Number(params.article_id);
  const [article, setArticle] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getArticle(articleId).then(setArticle).catch((err) => setError(err.message));
    getKeywords(articleId)
      .then((data) => setKeywords(data.keywords))
      .catch(() => setKeywords([]));

    // Record a "view" in the reader's history (P2's API) if they are logged in
    const session = getSession();
    if (session) {
      addHistory({
        user_id: session.user_id,
        article_id: articleId,
        event_type: "view",
      }).catch(() => {}); // History is a nice-to-have; never block the article
    }
  }, [articleId]);

  if (error) {
    return (
      <main>
        <p className="error">{error}</p>
      </main>
    );
  }

  if (!article) {
    return (
      <main>
        <p>Loading...</p>
      </main>
    );
  }

  // Do not link synthetic demo articles to placeholder domains.
  const hasRealSourceUrl =
    article.url && !/example\.(com|org|net)/i.test(article.url);

  return (
    <main className="narrow">
      <p className="kicker">{article.source.source_name}</p>
      <h1>{article.title}</h1>

      <p className="muted">
        {formatDate(article.published_at)}
        {hasRealSourceUrl ? (
          <>
            {" · "}
            <a href={article.url} target="_blank" rel="noreferrer">
              Read original
            </a>
          </>
        ) : (
          <span> · Synthetic demo article, no original source</span>
        )}
      </p>

      <div className="tags">
        {article.topics.map((topic) => (
          <Link key={topic.topic_id} href={`/compare/${topic.topic_id}`} className="tag">
            Compare sources on {topic.topic_name} →
          </Link>
        ))}
      </div>

      {article.summary && <p className="summary">{article.summary}</p>}
      <p className="article-body">{article.content || "No article text stored yet."}</p>

      {keywords.length > 0 && (
        <>
          <h2 className="section-title">Keywords</h2>
          <div className="tags">
            {keywords.map((word) => (
              <span key={word} className="tag">{word}</span>
            ))}
          </div>
        </>
      )}

      {/* P2: perspective panel goes here, e.g. <PerspectivePanel articleId={articleId} /> */}
    </main>
  );
}
