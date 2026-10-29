"use client";
// Owner: P1
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSession, logout } from "@/lib/api";

export default function NavBar() {
  const [session, setSession] = useState(null);

  // localStorage only exists in the browser, so read it after the page loads
  useEffect(() => {
    setSession(getSession());
  }, []);

  function handleLogout() {
    logout();
    window.location.href = "/";
  }

  return (
    <nav>
      <Link href="/" className="brand">News Perspective Explorer</Link>
      <span className="spacer" />
      {session ? (
        <>
          <Link href="/feed">My feed</Link>
          <Link href="/bookmarks">Saved</Link>
          <Link href="/history">History</Link>
          {session.role === "admin" && (
            <>
              <Link href="/admin/articles">Add article</Link>
              <Link href="/admin/terms">Terms</Link>
              <Link href="/admin/stats">Stats</Link>
              <Link href="/admin/searches">Search logs</Link>
              <Link href="/admin/procedures">Procedures</Link>
            </>
          )}
          <Link href="/">{session.name}</Link>
          <a href="#" onClick={handleLogout}>Logout</a>
        </>
      ) : (
        <>
          <Link href="/login">Login</Link>
          <Link href="/register">Register</Link>
        </>
      )}
    </nav>
  );
}
