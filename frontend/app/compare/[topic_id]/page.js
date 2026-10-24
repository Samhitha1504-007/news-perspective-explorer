"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { compare, getPerspectives } from "@/lib/api";

const COLORS = {
  positive: "#16a34a",
  neutral: "#64748b",
  critical: "#dc2626",
};

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
  const labels = ["positive", "neutral", "critical"];

  return (
    <main>
      <p><Link href="/">← All topics</Link></p>
      <h1>Source comparison: {data?.topic || `Topic ${topicId}`}</h1>
      <p>Compare how the available news sources cover this topic.</p>

      {distribution && (
        <section style={{ margin: "24px 0" }}>
          <h2>Overall perspective distribution</h2>
          <p>Articles analysed: {distribution.total_articles ?? 0}</p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "12px 0" }}>
            {labels.map((label) => (
              <div key={label} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, minWidth: 120 }}>
                <strong style={{ color: COLORS[label] }}>
                  {label[0].toUpperCase() + label.slice(1)}
                </strong>
                <div style={{ fontSize: 24 }}>
                  {distribution.distribution?.[label] ?? 0}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <h2>Compare by source</h2>

      {sources.length === 0 ? (
        <p>No source comparison data is available for this topic yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          {sources.map((source) => (
            <section key={source.source_id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16 }}>
              <h3>{source.source_name}</h3>
              <p>Articles: {source.article_count ?? 0}</p>

              {labels.map((label) => {
                const value = Number(source[label] ?? 0);
                const width = Math.max(0, Math.min(100, value));

                return (
                  <div key={label} style={{ margin: "14px 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 5 }}>
                      <span>{label[0].toUpperCase() + label.slice(1)}</span>
                      <strong>{value.toFixed(1)}%</strong>
                    </div>
                    <div style={{ background: "#e5e7eb", borderRadius: 8, height: 10, overflow: "hidden" }}>
                      <div style={{ background: COLORS[label], width: `${width}%`, height: "100%" }} />
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
