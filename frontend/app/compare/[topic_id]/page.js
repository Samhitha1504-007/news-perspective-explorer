"use client";
// Owner: P2

import { useEffect, useState } from "react";
import Link from "next/link";
import { compare, getPerspectives } from "@/lib/api";

const LABELS = ["positive", "neutral", "critical"];

// The view returns score totals per source (e.g. positive 2.5, neutral 6.0).
// Turn them into shares of 100% so sources can be compared fairly.
function toPercentages(source) {
  const total = LABELS.reduce((sum, label) => sum + Number(source[label] ?? 0), 0);
  const result = {};
  for (const label of LABELS) {
    result[label] = total > 0 ? (Number(source[label] ?? 0) / total) * 100 : 0;
  }
  return result;
}

function capitalize(word) {
  return word[0].toUpperCase() + word.slice(1);
}

export default function ComparePage({ params }) {
  const topicId = params.topic_id;
  const [data, setData] = useState(null);
  const [distribution, setDistribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const [comparison, perspectives] = await Promise.all([
          compare(topicId),
          getPerspectives(topicId),
        ]);

        if (active) {
          setData(comparison);
          setDistribution(perspectives);
        }
      } catch (err) {
        if (active) setError(err.message || "Could not load comparison.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [topicId]);

  if (loading) return <main><p>Loading comparison...</p></main>;

  if (error) {
    return (
      <main>
        <h1>Source comparison</h1>
        <p className="error">{error}</p>
        <button onClick={() => window.location.reload()}>Try again</button>
      </main>
    );
  }

  const sources = data?.sources || [];

  return (
    <main>
      <p><Link href="/">← All topics</Link></p>
      <p className="kicker">Source comparison</p>
      <h1>{data?.topic || `Topic ${topicId}`}</h1>
      <p className="lede">How each news source frames this topic.</p>

      {distribution && (
        <>
          <h2 className="section-title">
            All articles on this topic · {distribution.total_articles ?? 0} analysed
          </h2>
          <div className="stats">
            {LABELS.map((label) => (
              <div key={label} className={`stat stat-${label}`}>
                <div className="muted">{capitalize(label)}</div>
                <div className="number">{distribution.distribution?.[label] ?? 0}</div>
                <div className="muted">articles</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h2 className="section-title">By source</h2>
      <div className="legend">
        {LABELS.map((label) => (
          <span key={label}>
            <span className={`dot bar-${label}`} />
            {capitalize(label)}
          </span>
        ))}
      </div>

      {sources.length === 0 ? (
        <p>No source comparison data is available for this topic yet.</p>
      ) : (
        <div style={{ marginTop: 16 }}>
          {sources.map((source) => {
            const percent = toPercentages(source);
            return (
              <section key={source.source_id} className="card">
                <h3>{source.source_name}</h3>
                <p className="muted">
                  {source.article_count ?? 0} article(s)
                </p>
                {/* One bar, three parts: each part's width is its share of the total score */}
                <div className="bar">
                  {LABELS.map((label) => (
                    <div key={label} className={`bar-${label}`} style={{ width: `${percent[label]}%` }} />
                  ))}
                </div>
                <p className="muted">
                  {LABELS.map((label) => `${capitalize(label)} ${percent[label].toFixed(0)}%`).join(" · ")}
                </p>
                <p className="muted">
                  Labels: {source.positive_articles} positive · {source.neutral_articles} neutral · {source.critical_articles} critical
                </p>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
