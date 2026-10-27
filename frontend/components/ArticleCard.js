// Owner: P1
// One article in a list. `article` comes from v_article_details
// (search, feed, bookmarks, related): topics is a comma-separated string.
import Link from "next/link";

export default function ArticleCard({ article, children }) {
  const topics = Array.isArray(article.topics)
    ? article.topics.map((t) => t.topic_name)
    : (article.topics || "").split(", ").filter(Boolean);

  return (
    <div className="card">
      <h3>
        <Link href={`/articles/${article.article_id}`}>{article.title}</Link>
      </h3>
      <p className="muted">
        {article.source_name} · {formatDate(article.published_at)}
      </p>
      <div className="tags">
        {article.label && <span className={`label label-${article.label}`}>{article.label}</span>}
        {topics.map((name) => <span key={name} className="tag">{name}</span>)}
      </div>
      {children}
    </div>
  );
}

export function formatDate(isoDate) {
  return isoDate
    ? new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "No date";
}
