
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
    <main>
      <h1>{article.title}</h1>

      <p className="muted">
        {article.source.source_name} · {formatDate(article.published_at)}
        {hasRealSourceUrl ? (
          <>
            {" · "}
            <a href={article.url} target="_blank" rel="noreferrer">
              Read Original
            </a>
          </>
        ) : (
          <span> · Synthetic demo article — no original source available.</span>
        )}
      </p>

      <div className="topics">
        {article.topics.map((topic) => (
          <Link key={topic.topic_id} href={`/compare/${topic.topic_id}`}>
            Compare sources on {topic.topic_name}
          </Link>
        ))}
      </div>

      <div className="card">
        <p>
          <strong>Summary:</strong> {article.summary}
        </p>
        <p className="content">
          {article.content || "No article text stored yet."}
        </p>
      </div>

      {keywords.length > 0 && (
        <p className="muted">Keywords: {keywords.join(", ")}</p>
      )}

      {/* P2: perspective panel goes here, e.g. <PerspectivePanel articleId={articleId} /> */}
    </main>
  );
}
