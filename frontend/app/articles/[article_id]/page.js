"use client";
// Owner: P1
import Link from "next/link";
import { useEffect, useState } from "react";
import ArticleCard, { formatDate } from "@/components/ArticleCard";
import Comments from "@/components/Comments";
import FeedbackBox from "@/components/FeedbackBox";
import HighlightedText from "@/components/HighlightedText";
import PerspectivePanel from "@/components/PerspectivePanel";
import {
  addBookmark, addHistory, analyze, deleteArticle, followSource, followTopic, getArticle,
  getKeywords, getRelated, getSession, removeBookmark, unfollowSource, unfollowTopic,
} from "@/lib/api";

export default function ArticlePage({ params }) {
  const articleId = Number(params.article_id);
  const [article, setArticle] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [related, setRelated] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getArticle(articleId).then(setArticle).catch((err) => setError(err.message));
    getKeywords(articleId).then((d) => setKeywords(d.keywords)).catch(() => setKeywords([]));
    analyze(articleId).then(setAnalysis).catch(() => setAnalysis(null));
    getRelated(articleId).then((d) => setRelated(d.related)).catch(() => setRelated([]));
    setIsAdmin(getSession()?.role === "admin");
    addHistory({ article_id: articleId, event_type: "view" }).catch(() => {});
  }, [articleId]);

  if (error) return <main><p className="error">{error}</p></main>;
  if (!article) return <main><p>Loading...</p></main>;

  async function toggleBookmark() {
    try {
      if (article.bookmarked) await removeBookmark(articleId);
      else await addBookmark(articleId);
      setArticle({ ...article, bookmarked: !article.bookmarked });
    } catch (err) { setError(err.message); }
  }

  async function toggleSource() {
    try {
      if (article.following_source) await unfollowSource(article.source.source_id);
      else await followSource(article.source.source_id);
      setArticle({ ...article, following_source: !article.following_source });
    } catch (err) { setError(err.message); }
  }

  async function toggleTopic(topic) {
    try {
      if (topic.following) await unfollowTopic(topic.topic_id);
      else await followTopic(topic.topic_id);
      setArticle({
        ...article,
        topics: article.topics.map((t) => (t.topic_id === topic.topic_id ? { ...t, following: !t.following } : t)),
      });
    } catch (err) { setError(err.message); }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this article? Its scores, comments and bookmarks go too.")) return;
    try {
      await deleteArticle(articleId);
      window.location.href = "/";
    } catch (err) { setError(err.message); }
  }

  const hasRealUrl = article.url && !/example\.(com|org|net)/i.test(article.url);

  return (
    <main className="narrow">
      <p className="kicker">{article.source.source_name}</p>
      <h1>{article.title}</h1>
      <p className="muted">
        {formatDate(article.published_at)}
        {hasRealUrl && (
          <> · <a href={article.url} target="_blank" rel="noreferrer">Read the original on {article.source.source_name} ↗</a></>
        )}
      </p>

      <div className="actions">
        <button className={`toggle ${article.bookmarked ? "on" : ""}`} onClick={toggleBookmark}>
          {article.bookmarked ? "★ Saved" : "☆ Save"}
        </button>
        <button className={`toggle ${article.following_source ? "on" : ""}`} onClick={toggleSource}>
          {article.following_source ? "Following" : "Follow"} {article.source.source_name}
        </button>
        {article.topics.map((topic) => (
          <button key={topic.topic_id} className={`toggle ${topic.following ? "on" : ""}`} onClick={() => toggleTopic(topic)}>
            {topic.following ? "Following" : "Follow"} {topic.topic_name}
          </button>
        ))}
      </div>

      <div className="tags">
        {article.topics.map((topic) => (
          <Link key={topic.topic_id} href={`/compare/${topic.topic_id}`} className="tag">
            Compare sources on {topic.topic_name} →
          </Link>
        ))}
      </div>

      {analysis && <PerspectivePanel analysis={analysis} />}
      {analysis && <FeedbackBox articleId={articleId} label={analysis.label} initial={article.feedback} />}

      {article.summary && <p className="summary">{article.summary}</p>}
      <p className="muted">Summary of the article, written for this project. The full story is at the link above.</p>
      <p className="article-body">
        <HighlightedText text={article.content} terms={analysis?.matched_terms} />
      </p>

      {keywords.length > 0 && (
        <>
          <h2 className="section-title">Keywords</h2>
          <div className="tags">
            {keywords.map((word) => <span key={word} className="tag">{word}</span>)}
          </div>
        </>
      )}

      <Comments articleId={articleId} />

      {isAdmin && (
        <p style={{ marginTop: 32 }}>
          <button className="secondary" onClick={handleDelete}>Delete article (admin)</button>
        </p>
      )}

      {related.length > 0 && (
        <>
          <h2 className="section-title">More on this topic</h2>
          {related.map((item) => <ArticleCard key={item.article_id} article={item} />)}
        </>
      )}
    </main>
  );
}
