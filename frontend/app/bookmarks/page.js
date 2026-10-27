"use client";
// Owner: P1
import Link from "next/link";
import { useEffect, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import { getBookmarks, removeBookmark } from "@/lib/api";

export default function BookmarksPage() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getBookmarks().then((d) => setItems(d.bookmarks)).catch((err) => setError(err.message));
  }, []);

  async function remove(articleId) {
    try {
      await removeBookmark(articleId);
      setItems(items.filter((i) => i.article_id !== articleId));
    } catch (err) { setError(err.message); }
  }

  return (
    <main>
      <p className="kicker">Your library</p>
      <h1>Saved articles</h1>
      {error && <p className="error">{error}</p>}
      {items && items.length === 0 && <p>Nothing saved yet. Use ☆ Save on any article. <Link href="/">Browse topics</Link></p>}
      {items?.map((article) => (
        <ArticleCard key={article.article_id} article={article}>
          <p className="muted">
            Saved {new Date(article.saved_at).toLocaleDateString("en-GB")} ·{" "}
            <button className="link" onClick={() => remove(article.article_id)}>Remove</button>
          </p>
        </ArticleCard>
      ))}
    </main>
  );
}
