"use client";
// Owner: P1
// The backend also checks the role. Hiding this page from readers is only
// for convenience; POST /admin/articles rejects non-admins with 403.
import { useEffect, useState } from "react";
import { createArticle, getSession, getSources, getTopics } from "@/lib/api";

const EMPTY_FORM = { source_id: "", title: "", url: "", published_at: "", summary: "", content: "" };

export default function AdminArticlesPage() {
  const [session, setSession] = useState(null);
  const [sources, setSources] = useState([]);
  const [topics, setTopics] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [topicIds, setTopicIds] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSession(getSession());
    getSources().then((data) => setSources(data.sources)).catch((err) => setError(err.message));
    getTopics().then(setTopics).catch((err) => setError(err.message));
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  // Tick adds the topic id, untick removes it
  function toggleTopic(topicId) {
    setTopicIds(topicIds.includes(topicId)
      ? topicIds.filter((id) => id !== topicId)
      : [...topicIds, topicId]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    try {
      const result = await createArticle({
        ...form,
        source_id: Number(form.source_id),
        url: form.url || null,
        published_at: form.published_at || null,
        topic_ids: topicIds,
      });
      setMessage(`Saved as article ${result.article_id} (perspective: ${result.label || "not scored"})`);
      setForm(EMPTY_FORM);
      setTopicIds([]);
    } catch (err) {
      setError(err.message);
    }
  }

  if (session?.role !== "admin") {
    return <main><p className="error">Admins only. Please log in as an admin.</p></main>;
  }

  return (
    <main>
      <p className="kicker">Admin</p>
      <h1>Add an article</h1>
      <p className="lede">Saved with the sp_add_article stored procedure, then scored automatically.</p>
      <form onSubmit={handleSubmit} className="panel">
        <select name="source_id" value={form.source_id} onChange={handleChange} required>
          <option value="">Choose a source</option>
          {sources.map((source) => (
            <option key={source.source_id} value={source.source_id}>{source.source_name}</option>
          ))}
        </select>
        <input name="title" placeholder="Title" value={form.title} onChange={handleChange} required />
        <input name="url" placeholder="URL (optional)" value={form.url} onChange={handleChange} />
        <input name="published_at" type="datetime-local" value={form.published_at} onChange={handleChange} />
        <textarea name="summary" placeholder="Short summary" rows={2} value={form.summary} onChange={handleChange} />
        <textarea name="content" placeholder="Full article text" rows={8} value={form.content} onChange={handleChange} required />

        <div>
          <p>Topics (choose at least one):</p>
          {topics.map((topic) => (
            <label key={topic.topic_id} style={{ display: "block", fontWeight: 400 }}>
              <input type="checkbox" checked={topicIds.includes(topic.topic_id)}
                onChange={() => toggleTopic(topic.topic_id)} /> {topic.topic_name}
            </label>
          ))}
        </div>

        <button type="submit" disabled={topicIds.length === 0}>Save article</button>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
      </form>
    </main>
  );
}
