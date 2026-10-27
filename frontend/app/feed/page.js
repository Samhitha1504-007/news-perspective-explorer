"use client";
// Owner: P1
import Link from "next/link";
import { useEffect, useState } from "react";
import ArticleCard from "@/components/ArticleCard";
import {
  followSource, followTopic, getFeed, getFollows, getSources, getTopics, unfollowSource, unfollowTopic,
} from "@/lib/api";

export default function FeedPage() {
  const [feed, setFeed] = useState(null);
  const [topics, setTopics] = useState([]);
  const [sources, setSources] = useState([]);
  const [follows, setFollows] = useState({ topics: [], sources: [] });
  const [error, setError] = useState("");

  async function load() {
    try {
      const [f, fl, t, s] = await Promise.all([getFeed(), getFollows(), getTopics(), getSources()]);
      setFeed(f.feed);
      setFollows(fl);
      setTopics(t);
      setSources(s.sources);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { load(); }, []);

  const followsTopic = (id) => follows.topics.some((t) => t.topic_id === id);
  const followsSource = (id) => follows.sources.some((s) => s.source_id === id);

  async function toggle(kind, id, on) {
    try {
      if (kind === "topic") await (on ? unfollowTopic(id) : followTopic(id));
      else await (on ? unfollowSource(id) : followSource(id));
      await load();
    } catch (err) { setError(err.message); }
  }

  return (
    <main>
      <p className="kicker">Personalised</p>
      <h1>My feed</h1>
      <p className="lede">Articles from the topics and sources you follow, built by the stored procedure sp_user_feed.</p>
      {error && <p className="error">{error}</p>}

      <h2 className="section-title">Follow topics</h2>
      <div className="actions">
        {topics.map((t) => (
          <button key={t.topic_id} className={`toggle ${followsTopic(t.topic_id) ? "on" : ""}`}
            onClick={() => toggle("topic", t.topic_id, followsTopic(t.topic_id))}>
            {t.topic_name}
          </button>
        ))}
      </div>
      <h2 className="section-title">Follow sources</h2>
      <div className="actions">
        {sources.map((s) => (
          <button key={s.source_id} className={`toggle ${followsSource(s.source_id) ? "on" : ""}`}
            onClick={() => toggle("source", s.source_id, followsSource(s.source_id))}>
            {s.source_name}
          </button>
        ))}
      </div>

      <h2 className="section-title">{feed ? `${feed.length} article(s)` : "Loading"}</h2>
      {feed && feed.length === 0 && (
        <p>Follow a topic or a source above to fill your feed, or <Link href="/">browse topics</Link>.</p>
      )}
      {feed?.map((article) => (
        <ArticleCard key={article.article_id} article={article}>
          <p className="reason">Because you follow {article.reasons}</p>
        </ArticleCard>
      ))}
    </main>
  );
}
