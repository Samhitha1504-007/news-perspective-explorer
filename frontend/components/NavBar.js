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
      <Link href="/">News Perspective Explorer</Link>
      <span className="spacer" />
      {session ? (
        <>
          <Link href="/history">History</Link>
          {session.role === "admin" && <Link href="/admin/articles">Admin</Link>}
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
