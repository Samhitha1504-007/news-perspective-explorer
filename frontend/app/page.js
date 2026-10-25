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
      <p className="kicker">Compare the coverage</p>
      <h1>Same story, different sources.</h1>
      <p className="lede">
        Search an event and see how each news source frames it, using a
        rule-based Positive / Neutral / Critical indicator.
      </p>
      <SearchBar />

      <h2 className="section-title">Browse by topic</h2>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        {topics.map((topic) => (
          <div key={topic.topic_id} className="card">
            <h3>
              <Link href={`/search?query=${encodeURIComponent(topic.topic_name)}`}>{topic.topic_name}</Link>
            </h3>
            <p className="muted">{topic.description}</p>
            <Link href={`/compare/${topic.topic_id}`}>Compare sources →</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
