// Owner: P1
// One search result. `article` has the shape returned by GET /search.
import Link from "next/link";

export default function ArticleCard({ article }) {
  return (
    <div className="card">
      <h3>
        <Link href={`/articles/${article.article_id}`}>{article.title}</Link>
      </h3>
      <p className="muted">
        {article.source_name} · {formatDate(article.published_at)} ·{" "}
        {article.topics.map((topic) => topic.topic_name).join(", ")}
      </p>
      {article.label && <span className={`label label-${article.label}`}>{article.label}</span>}
    </div>
  );
}

export function formatDate(isoDate) {
  return isoDate ? new Date(isoDate).toLocaleDateString() : "No date";
}
