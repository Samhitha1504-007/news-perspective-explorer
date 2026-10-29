"use client";
// Owner: P1 + P2 (shared)
// Admin page: run each stored function / procedure from the UI and see the
// SQL that ran and the result. The logic itself lives in
// database/mysql/02_functions_procedures.sql.
import { useState } from "react";
import { runProcedure } from "@/lib/api";

// Each card: routine name, what it does, its inputs (number inputs are sent as numbers).
const ROUTINES = [
  { name: "fn_count_term", about: "Function: how many times a word appears in a text (whole words).",
    inputs: [["Text", "text", "The deal was a historic breakthrough"], ["Word", "text", "historic"]] },
  { name: "fn_article_label", about: "Function: the stored label of an article.",
    inputs: [["article_id", "number", "1"]] },
  { name: "fn_agreement_pct", about: "Function: % of readers who agree with an article's label.",
    inputs: [["article_id", "number", "1"]] },
  { name: "sp_score_article", about: "Procedure: re-score one article from its text, then show its scores.",
    inputs: [["article_id", "number", "1"]] },
  { name: "sp_topic_perspective_summary", about: "Procedure with OUT parameters: label counts for a topic.",
    inputs: [["topic_id", "number", "1"]] },
  { name: "sp_user_feed", about: "Procedure: a user's feed from the topics and sources they follow.",
    inputs: [["user_id", "number", "2"]] },
  { name: "sp_change_user_role", about: "Procedure: make a user admin or reader.",
    inputs: [["email", "text", "reader2@example.com"], ["role (admin / reader)", "text", "reader"]] },
];

function Routine({ routine }) {
  const [values, setValues] = useState(routine.inputs.map((input) => input[2]));
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function run(event) {
    event.preventDefault();
    setError("");
    setResult(null);
    const args = values.map((v, i) => (routine.inputs[i][1] === "number" ? Number(v) : v));
    try {
      setResult(await runProcedure(routine.name, args));
    } catch (err) {
      setError(err.message);
    }
  }

  const columns = result?.rows.length ? Object.keys(result.rows[0]) : [];
  return (
    <div className="card">
      <h3>{routine.name}</h3>
      <p className="muted">{routine.about}</p>
      <form onSubmit={run} className="filters">
        {routine.inputs.map(([label, type], i) => (
          <label key={label}>
            {label}{" "}
            <input type={type} value={values[i]}
              onChange={(e) => setValues(values.map((v, j) => (j === i ? e.target.value : v)))} />
          </label>
        ))}
        <button type="submit">Run</button>
      </form>
      {error && <p className="error">{error}</p>}
      {result && (
        <>
          <pre className="muted">{result.sql.join(";\n")};</pre>
          {result.rows.length === 0 ? <p className="muted">No rows.</p> : (
            <div className="table-wrap">
              <table>
                <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i}>{columns.map((c) => <td key={c}>{String(row[c] ?? "NULL")}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProceduresPage() {
  return (
    <main>
      <p className="kicker">Admin · MySQL</p>
      <h1>Procedures and functions</h1>
      <p className="lede">Run our stored functions and procedures and see the result.</p>
      {ROUTINES.map((routine) => <Routine key={routine.name} routine={routine} />)}
    </main>
  );
}
