"use client";

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
      <h1>Reading history</h1>
      <p>Articles you have interacted with, newest first.</p>

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
          <p>{history.length} recent event(s)</p>
          <div style={{ display: "grid", gap: 12 }}>
            {history.map((item, index) => (
              <article
                key={`${item.article_id}-${item.timestamp}-${index}`}
                style={{
                  border: "1px solid #ddd",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <h2 style={{ marginTop: 0 }}>
                  <Link href={`/articles/${item.article_id}`}>
                    {item.title || "Article unavailable"}
                  </Link>
                </h2>
                <p>Activity: {item.event_type}</p>
                <p>
                  {item.timestamp
                    ? new Date(item.timestamp).toLocaleString()
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
