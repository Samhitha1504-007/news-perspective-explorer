"use client";
// Owner: P1
import Link from "next/link";
import { useState } from "react";
import { register } from "@/lib/api";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // One handler for all three inputs: the input's name says which field
  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      await register(form);
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
  }

  if (done) {
    return (
      <main>
        <p className="success">Account created. <Link href="/login">Login now</Link></p>
      </main>
    );
  }

  return (
    <main>
      <h1>Register</h1>
      <form onSubmit={handleSubmit}>
        <input name="name" placeholder="Name" value={form.name} onChange={handleChange} required />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required />
        <input name="password" type="password" placeholder="Password (min 6 characters)"
          value={form.password} onChange={handleChange} minLength={6} required />
        <button type="submit">Create account</button>
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
