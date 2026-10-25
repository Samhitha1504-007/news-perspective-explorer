

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  createTerm,
  deleteTerm,
  getAdminTerms,
  getSession,
  updateTerm,
} from "@/lib/api";

const CATEGORIES = [
  { id: 1, name: "Positive" },
  { id: 2, name: "Neutral" },
  { id: 3, name: "Critical" },
];

const EMPTY_FORM = {
  term: "",
  category_id: "1",
  weight: "1",
};

export default function AdminTermsPage() {
  const [terms, setTerms] = useState([]);
  const [edits, setEdits] = useState({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [forbidden, setForbidden] = useState(false);

  const loadTerms = useCallback(async () => {
    setLoading(true);
    setError("");
    setForbidden(false);

    try {
      const session = getSession();

      if (!session) {
        setForbidden(true);
        setError("Please log in with an administrator account.");
        return;
      }

      if (session.role !== "admin") {
        setForbidden(true);
        setError("Access denied. This page is for administrators only.");
        return;
      }

      const data = await getAdminTerms();
      setTerms(Array.isArray(data) ? data : []);
      setEdits({});
    } catch (err) {
      setError(err.message || "Could not load perspective terms.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTerms();
  }, [loadTerms]);

  function changeField(termId, field, value) {
    setEdits((current) => ({
      ...current,
      [termId]: {
        ...current[termId],
        [field]: value,
      },
    }));
    setMessage("");
    setError("");
  }

  function changeForm(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setMessage("");
    setError("");
  }

  async function handleCreate(event) {
    event.preventDefault();

    const cleanTerm = form.term.trim();
    const categoryId = Number(form.category_id);
    const weight = Number(form.weight);

    if (!cleanTerm) {
      setError("Enter a term or phrase.");
      return;
    }

    if (cleanTerm.length > 100) {
      setError("The term must be 100 characters or fewer.");
      return;
    }

    if (![1, 2, 3].includes(categoryId)) {
      setError("Choose a valid category.");
      return;
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      setError("Weight must be a number greater than zero.");
      return;
    }

    setCreating(true);
    setError("");
    setMessage("");

    try {
      const result = await createTerm({
        term: cleanTerm,
        category_id: categoryId,
        weight,
      });

      setForm(EMPTY_FORM);
      setMessage(
        `Term "${cleanTerm}" added successfully. ${
          result.rescored_count ?? 0
        } article(s) re-scored.`
      );

      await loadTerms();
    } catch (err) {
      setError(err.message || "Could not add the perspective term.");
    } finally {
      setCreating(false);
    }
  }

  async function removeTerm(term) {
    if (!window.confirm(`Delete "${term.term}"? Articles will be re-scored without it.`)) return;
    setError("");
    setMessage("");
    try {
      const result = await deleteTerm(term.term_id);
      setMessage(`"${term.term}" deleted. ${result.rescored_count} article(s) re-scored.`);
      await loadTerms();
    } catch (err) {
      setError(err.message || "Could not delete this term.");
    }
  }

  async function saveTerm(term) {
    const edit = edits[term.term_id] || {};
    const body = {};

    if (edit.term !== undefined && edit.term.trim() !== term.term) {
      body.term = edit.term.trim();
    }

    if (
      edit.category_id !== undefined &&
      Number(edit.category_id) !== Number(term.category_id)
    ) {
      body.category_id = Number(edit.category_id);
    }

    if (
      edit.weight !== undefined &&
      Number(edit.weight) !== Number(term.weight)
    ) {
      body.weight = Number(edit.weight);
    }

    if (Object.keys(body).length === 0) {
      setMessage("No changes to save.");
      return;
    }

    if (body.term !== undefined && !body.term) {
      setError("Term cannot be blank.");
      return;
    }

    if (
      body.weight !== undefined &&
      (!Number.isFinite(body.weight) || body.weight <= 0)
    ) {
      setError("Weight must be a number greater than zero.");
      return;
    }

    setSavingId(term.term_id);
    setError("");
    setMessage("");

    try {
      const result = await updateTerm(term.term_id, body);

      setMessage(
        `"${term.term}" updated. ${
          result.rescored_count ?? 0
        } article(s) re-scored.`
      );

      await loadTerms();
    } catch (err) {
      setError(err.message || "Could not update this term.");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <main>
        <h1>Admin: Perspective Terms</h1>
        <p>Loading perspective terms...</p>
      </main>
    );
  }

  return (
    <main>
      <p className="kicker">Admin</p>
      <h1>Perspective terms</h1>

      <p className="lede">
        Manage the terms used to classify articles as Positive, Neutral, or
        Critical. Saving a change may trigger article re-scoring.
      </p>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {message && <p role="status">{message}</p>}

      {forbidden ? (
        <button onClick={() => (window.location.href = "/login")}>
          Go to Login
        </button>
      ) : (
        <>
          <section className="panel" style={{ maxWidth: 650 }}>
            <h2>Add New Perspective Term</h2>

            <p className="muted">
              Add a word or phrase used by the perspective scoring system.
            </p>

            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "14px" }}>
                <label
                  htmlFor="new-term"
                  style={{ display: "block", marginBottom: "6px" }}
                >
                  Term or phrase
                </label>

                <input
                  id="new-term"
                  type="text"
                  maxLength={100}
                  required
                  placeholder="e.g. promising breakthrough"
                  value={form.term}
                  onChange={(event) =>
                    changeForm("term", event.target.value)
                  }
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label
                  htmlFor="new-category"
                  style={{ display: "block", marginBottom: "6px" }}
                >
                  Category
                </label>

                <select
                  id="new-category"
                  value={form.category_id}
                  onChange={(event) =>
                    changeForm("category_id", event.target.value)
                  }
                  style={{ width: "100%" }}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "16px" }}>
                <label
                  htmlFor="new-weight"
                  style={{ display: "block", marginBottom: "6px" }}
                >
                  Weight
                </label>

                <input
                  id="new-weight"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.weight}
                  onChange={(event) =>
                    changeForm("weight", event.target.value)
                  }
                  style={{ width: "140px" }}
                />
              </div>

              <button type="submit" disabled={creating}>
                {creating ? "Adding..." : "Add Term"}
              </button>
            </form>
          </section>

          <h2 className="section-title">Existing perspective terms</h2>

          {terms.length === 0 ? (
            <p>No perspective terms were found.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Term</th>
                    <th>Category</th>
                    <th>Weight</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {terms.map((term) => {
                    const edit = edits[term.term_id] || {};

                    return (
                      <tr key={term.term_id}>
                        <td>{term.term_id}</td>

                        <td>
                          <input
                            aria-label={`Term ${term.term_id}`}
                            value={edit.term ?? term.term}
                            maxLength={100}
                            onChange={(event) =>
                              changeField(
                                term.term_id,
                                "term",
                                event.target.value
                              )
                            }
                          />
                        </td>

                        <td>
                          <select
                            aria-label={`Category for ${term.term}`}
                            value={edit.category_id ?? term.category_id}
                            onChange={(event) =>
                              changeField(
                                term.term_id,
                                "category_id",
                                event.target.value
                              )
                            }
                          >
                            {CATEGORIES.map((category) => (
                              <option
                                key={category.id}
                                value={category.id}
                              >
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <input
                            aria-label={`Weight for ${term.term}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={edit.weight ?? term.weight}
                            onChange={(event) =>
                              changeField(
                                term.term_id,
                                "weight",
                                event.target.value
                              )
                            }
                            style={{ width: "90px" }}
                          />
                        </td>

                        <td>
                          <button
                            onClick={() => saveTerm(term)}
                            disabled={
                              savingId !== null || creating
                            }
                          >
                            {savingId === term.term_id
                              ? "Saving..."
                              : "Save"}
                          </button>{" "}
                          <button
                            className="secondary"
                            onClick={() => removeTerm(term)}
                            disabled={savingId !== null || creating}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
