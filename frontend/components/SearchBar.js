"use client";
// Owner: P1
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SearchBar({ initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  function handleSubmit(event) {
    event.preventDefault();
    if (query.trim()) router.push(`/search?query=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input placeholder="Search a topic or event, e.g. AI, election, inflation"
        value={query} onChange={(e) => setQuery(e.target.value)} />
      <button type="submit">Search</button>
    </form>
  );
}
