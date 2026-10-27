"use client";
// Owner: P2

import { useEffect, useState } from "react";
import Link from "next/link";
import { getHistory, getSession } from "@/lib/api";

export default function HistoryPage() {
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      const currentSession = getSession();

      if (!currentSession?.token || !currentSession?.user_id) {
        if (active) {
          setError("Please log in to view your reading history.");
          setLoading(false);
        }
        return;
      }

      if (active) setSession(currentSession);

      try {
        const result = await getHistory(currentSession.user_id);
        if (active) setHistory(result.history || []);
      } catch (err) {
        if (active) {
          setError(err.message || "Could not load your reading history.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHistory();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <p><Link href="/">← Home</Link></p>
      <p className="kicker">Your activity</p>
      <h1>Reading history</h1>
      <p className="lede">Articles you have opened, newest first.</p>

      {loading && <p>Loading your history...</p>}

      {!loading && error && (
        <section>
          <p className="error">{error}</p>
          {!session && <Link href="/login">Go to login</Link>}
        </section>
      )}

      {!loading && !error && history.length === 0 && (
        <section>
          <p>Your reading history is empty.</p>
          <p>Browse topics and open an article to get started.</p>
          <Link href="/">Explore topics</Link>
        </section>
      )}

      {!loading && !error && history.length > 0 && (
        <>
          <h2 className="section-title">{history.length} recent event(s)</h2>
          <div>
            {history.map((item, index) => (
              <article
                key={`${item.article_id}-${item.timestamp}-${index}`}
                className="card"
              >
                <h3>
                  <Link href={`/articles/${item.article_id}`}>
                    {item.title || "Article unavailable"}
                  </Link>
                </h3>
                <p className="muted">
                  <span className="tag">{item.event_type}</span>{" "}
                  {item.timestamp
                    ? new Date(item.timestamp).toLocaleString("en-GB")
                    : "Time unavailable"}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
