"use client";
// Owner: P1
// "Your recent searches" under the search bar: CRUD on MongoDB search_logs.
//   Create = searching (the search API inserts a log)
//   Read   = this list          Update = Pin / Unpin
//   Delete = × on one search, or "Clear history"
// Click a search to run it again.
import Link from "next/link";
import { useEffect, useState } from "react";
import { clearSearchHistory, deleteSearch, getSearchHistory, pinSearch } from "@/lib/api";

export default function SearchHistory({ refreshKey }) {
  const [searches, setSearches] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      setSearches((await getSearchHistory()).searches);
    } catch {
      setSearches([]); // MongoDB down: just hide the box, the search still works
    }
  }
  // Reload whenever a new search runs (refreshKey changes)
  useEffect(() => { load(); }, [refreshKey]);

  async function run(action) {
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (searches.length === 0 && !error) return null;
  return (
    <div className="panel">
      <h3>Your recent searches</h3>
      {error && <p className="error">{error}</p>}
      <div className="tags">
        {searches.map((s) => (
          <span key={s._id} className="tag">
            {s.pinned && "📌 "}
            <Link href={`/search?query=${encodeURIComponent(s.query)}`}>{s.query}</Link>
            {" "}
            <button className="link" onClick={() => run(() => pinSearch(s._id, !s.pinned))}>
              {s.pinned ? "Unpin" : "Pin"}
            </button>
            {" "}
            <button className="link" onClick={() => run(() => deleteSearch(s._id))} title="Delete">×</button>
          </span>
        ))}
      </div>
      <button className="link" onClick={() => run(clearSearchHistory)}>Clear history</button>
    </div>
  );
}
