"use client";
// Owner: P1
// Admin page: everyone's searches from MongoDB search_logs.
// Read = the table (find), Delete = "Delete" (deleteOne) / "Delete all" (deleteMany).
import { useEffect, useState } from "react";
import { clearSearchLogs, deleteSearchLog, getSearchLogs } from "@/lib/api";

export default function SearchLogsPage() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLogs((await getSearchLogs()).logs);
    } catch (err) {
      setError(err.message);
    }
  }
  useEffect(() => { load(); }, []);

  async function run(action) {
    setError("");
    try {
      await action();
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main>
      <p className="kicker">Admin · MongoDB</p>
      <h1>Search logs</h1>
      <p className="lede">What readers searched for, from the MongoDB collection <code>search_logs</code>.</p>
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>user_id</th><th>query</th><th>results</th><th>pinned</th><th>time</th><th></th></tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id}>
                <td>{log.user_id}</td>
                <td>{log.query}</td>
                <td>{log.result_count}</td>
                <td>{log.pinned ? "yes" : ""}</td>
                <td>{new Date(log.timestamp).toLocaleString("en-GB")}</td>
                <td><button className="link" onClick={() => run(() => deleteSearchLog(log._id))}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="actions">
        <button className="secondary" disabled={logs.length === 0}
          onClick={() => window.confirm("Delete ALL search logs?") && run(clearSearchLogs)}>
          Delete all
        </button>
      </div>
    </main>
  );
}
