"use client";
// Owner: P1
import Link from "next/link";
import { useState } from "react";
import { login, saveSession } from "@/lib/api";

// After login, go back to the page the user was sent here from (?next=...).
// Only paths inside our site ("/..."), so a link cannot send users elsewhere.
function safeNext(next) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage({ searchParams }) {
  const next = safeNext(searchParams.next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      const session = await login({ email, password });
      saveSession(session);
      window.location.href = next; // full reload so the nav bar shows the user
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="auth">
      <h1>Login</h1>
      {searchParams.next && <p className="muted">Please log in to continue.</p>}
      <form onSubmit={handleSubmit} className="panel">
        <input type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
        {error && <p className="error">{error}</p>}
      </form>
      <p>No account? <Link href="/register">Register</Link></p>
    </main>
  );
}
