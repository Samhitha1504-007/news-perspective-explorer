"use client";
// Owner: P2
// The rules (valid vote, suggestion only when disagreeing, suggestion must
// differ from the current label) are enforced in SQL by sp_set_feedback.
import { useState } from "react";
import { clearFeedback, setFeedback } from "@/lib/api";

const LABELS = ["Positive", "Neutral", "Critical"];

export default function FeedbackBox({ articleId, label, initial }) {
  const [feedback, setState] = useState(initial);
  const [suggestion, setSuggestion] = useState(initial?.my_suggestion || "");
  const [error, setError] = useState("");

  async function vote(choice) {
    setError("");
    try {
      setState(await setFeedback(articleId, choice, choice === "disagree" ? suggestion : null));
    } catch (err) {
      setError(err.message);
    }
  }

  async function clear() {
    setError("");
    try {
      setState(await clearFeedback(articleId));
      setSuggestion("");
    } catch (err) {
      setError(err.message);
    }
  }

  const votes = feedback?.votes ?? 0;
  return (
    <section className="panel">
      <p className="kicker">Do you agree with this label?</p>
      <div className="feedback-row">
        <button className={`toggle ${feedback?.my_vote === "agree" ? "on" : ""}`} onClick={() => vote("agree")}>
          Agree
        </button>
        <button className={`toggle ${feedback?.my_vote === "disagree" ? "on" : ""}`} onClick={() => vote("disagree")}>
          Disagree
        </button>
        <label className="muted">
          I think it is{" "}
          <select value={suggestion} onChange={(e) => setSuggestion(e.target.value)}>
            <option value="">(no suggestion)</option>
            {LABELS.filter((l) => l !== label).map((l) => <option key={l}>{l}</option>)}
          </select>
        </label>
        {feedback?.my_vote && <button className="link" onClick={clear}>Remove my vote</button>}
      </div>
      <p className="muted">
        {votes === 0
          ? "No reader feedback yet."
          : `${feedback.agreement_pct}% of ${votes} reader(s) agree · ${feedback.agree_count} agree, ${feedback.disagree_count} disagree`}
        {feedback?.my_vote && ` · Your vote: ${feedback.my_vote}${feedback.my_suggestion ? ` (suggested ${feedback.my_suggestion})` : ""}`}
      </p>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
