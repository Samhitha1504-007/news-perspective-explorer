"use client";
// Owner: P1 (Home / Search)
import Link from "next/link";
import { useEffect, useState } from "react";
import SearchBar from "@/components/SearchBar";
import { getTopics } from "@/lib/api";

export default function HomePage() {
  const [topics, setTopics] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getTopics().then(setTopics).catch((err) => setError(err.message));
  }, []);

  return (
    <main>
      <h1>News Perspective Explorer</h1>
      <p className="muted">
        See how different sources frame the same event, using a rule-based
        Positive / Neutral / Critical indicator.
      </p>
      <SearchBar />

      <h2>Browse by topic</h2>
      {error && <p className="error">{error}</p>}
      {topics.map((topic) => (
        <div key={topic.topic_id} className="card">
          <h3>
            <Link href={`/search?query=${encodeURIComponent(topic.topic_name)}`}>{topic.topic_name}</Link>
          </h3>
          <p className="muted">{topic.description}</p>
          <Link href={`/compare/${topic.topic_id}`}>Compare sources →</Link>
        </div>
      ))}
    </main>
  );
}
