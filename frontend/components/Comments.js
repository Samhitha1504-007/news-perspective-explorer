"use client";
// Owner: P1
import { useEffect, useState } from "react";
import { addComment, deleteComment, getComments, getSession } from "@/lib/api";

export default function Comments({ articleId }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);

  useEffect(() => {
    setSession(getSession());
    getComments(articleId).then((d) => setComments(d.comments)).catch((e) => setError(e.message));
  }, [articleId]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      const result = await addComment(articleId, text);
      setComments(result.comments);
      setText("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(commentId) {
    setError("");
    try {
      await deleteComment(commentId);
      setComments(comments.filter((c) => c.comment_id !== commentId));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <h2 className="section-title">Comments · {comments.length}</h2>
      <form onSubmit={submit}>
        <textarea rows={3} maxLength={1000} placeholder="Add a comment" value={text}
          onChange={(e) => setText(e.target.value)} />
        <button type="submit" disabled={!text.trim()}>Post comment</button>
      </form>
      {error && <p className="error">{error}</p>}
      <div style={{ marginTop: 12 }}>
        {comments.map((c) => (
          <div key={c.comment_id} className="comment">
            <span className="muted"><strong>{c.name}</strong> · {new Date(c.created_at).toLocaleString("en-GB")}</span>
            {(session?.user_id === c.user_id || session?.role === "admin") && (
              <> · <button className="link" onClick={() => remove(c.comment_id)}>Delete</button></>
            )}
            <p>{c.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
