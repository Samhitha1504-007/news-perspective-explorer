// Owner: P1
// One search result. `article` has the shape returned by GET /search.
import Link from "next/link";

export default function ArticleCard({ article }) {
  return (
    <div className="card">
      <h3>
        <Link href={`/articles/${article.article_id}`}>{article.title}</Link>
      </h3>
      <p className="muted">{formatDate(article.published_at)}</p>
      <div className="tags">
        {article.label && <span className={`label label-${article.label}`}>{article.label}</span>}
        {article.topics.map((topic) => (
          <span key={topic.topic_id} className="tag">{topic.topic_name}</span>
        ))}
      </div>
    </div>
  );
}

export function formatDate(isoDate) {
  return isoDate
    ? new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "No date";
}
