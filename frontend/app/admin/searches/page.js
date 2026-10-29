"use client";
// Owner: P1
// Admin page: CRUD on the MongoDB collection search_logs.
//   Create = "Add log" form      (insertOne)
//   Read   = the table            (find)
//   Update = "Edit" a query       (updateOne)
//   Delete = "Delete" / "Delete all" (deleteOne / deleteMany)
// Every search a reader makes also creates a log automatically.
import { useEffect, useState } from "react";
import {
  addSearchLog, clearSearchLogs, deleteSearchLog, getSearchLogs, updateSearchLog,
} from "@/lib/api";

export default function SearchLogsPage() {
  const [logs, setLogs] = useState([]);
  const [form, setForm] = useState({ user_id: "", query: "", result_count: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    try {
      setLogs((await getSearchLogs()).logs);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  // Run one action, show what happened, then reload the table.
  async function run(action, doneText) {
    setError("");
    setMessage("");
    try {
      await action();
      setMessage(doneText);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function add(event) {
    event.preventDefault();
    run(() => addSearchLog({
      user_id: Number(form.user_id),
      query: form.query,
      result_count: Number(form.result_count),
    }), "Inserted with insertOne()");
    setForm({ user_id: "", query: "", result_count: "" });
  }

  function edit(log) {
    const query = window.prompt("New query text", log.query);
    if (query) run(() => updateSearchLog(log._id, query), "Updated with updateOne()");
  }

  function removeAll() {
    if (window.confirm("Delete ALL search logs?")) run(clearSearchLogs, "All logs deleted with deleteMany()");
  }

  return (
    <main>
      <p className="kicker">Admin · MongoDB</p>
      <h1>Search logs</h1>
      <p className="lede">CRUD on the MongoDB collection <code>search_logs</code>.</p>

      <h2 className="section-title">Create</h2>
      <form onSubmit={add} className="filters">
        <input type="number" min="1" placeholder="user_id" required value={form.user_id}
          onChange={(e) => setForm({ ...form, user_id: e.target.value })} />
        <input placeholder="query" required value={form.query}
          onChange={(e) => setForm({ ...form, query: e.target.value })} />
        <input type="number" min="0" placeholder="result_count" required value={form.result_count}
          onChange={(e) => setForm({ ...form, result_count: e.target.value })} />
        <button type="submit">Add log</button>
      </form>

      {message && <p className="success">{message}</p>}
      {error && <p className="error">{error}</p>}

      <h2 className="section-title">Read · {logs.length} latest</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>_id</th><th>user_id</th><th>query</th><th>results</th><th>time</th><th></th></tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id}>
                <td className="muted">{log._id}</td>
                <td>{log.user_id}</td>
                <td>{log.query}</td>
                <td>{log.result_count}</td>
                <td>{new Date(log.timestamp).toLocaleString("en-GB")}</td>
                <td>
                  <button className="link" onClick={() => edit(log)}>Edit</button>
                  {" · "}
                  <button className="link" onClick={() => run(() => deleteSearchLog(log._id), "Deleted with deleteOne()")}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="actions">
        <button className="secondary" onClick={removeAll} disabled={logs.length === 0}>Delete all</button>
      </div>
    </main>
  );
}
