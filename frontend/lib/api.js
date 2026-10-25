
/* All backend calls go through here so endpoint paths live in one place. */
/* Paths and JSON keys follow the Shared API Contract exactly. */

import analyzeMock from "@/mocks/analyze_12.json";
import compareMock from "@/mocks/compare_1.json";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// ---------------- Login session (P1) ----------------
// After login we keep { token, user_id, name, role } in localStorage.

export function saveSession(session) {
  localStorage.setItem("session", JSON.stringify(session));
}

export function getSession() {
  if (typeof window === "undefined") return null;

  const saved = localStorage.getItem("session");
  return saved ? JSON.parse(saved) : null;
}

export function logout() {
  localStorage.removeItem("session");
}

async function request(path, options = {}) {
  const session = getSession();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Send the token so the backend knows who is calling.
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Handle responses that do not contain JSON.
  const contentType = res.headers.get("content-type");
  const data = contentType?.includes("application/json")
    ? await res.json()
    : null;

  // Show the backend's error message, e.g. "Wrong email or password".
  if (!res.ok) {
    throw new Error(
      typeof data?.detail === "string"
        ? data.detail
        : `Request failed (${res.status})`
    );
  }

  return data;
}

// ---------------- P1 ----------------

export const register = (body) =>
  request("/register", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const login = (body) =>
  request("/login", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getTopics = () => request("/topics");

export const search = (query) =>
  request(`/search?query=${encodeURIComponent(query)}`);

export const getArticle = (articleId) =>
  request(`/articles/${articleId}`);

export const getKeywords = (articleId) =>
  request(`/keywords/${articleId}`);

export const getRelated = (articleId) =>
  request(`/articles/${articleId}/related`);

export const createArticle = (body) =>
  request("/admin/articles", {
    method: "POST",
    body: JSON.stringify(body),
  });

export const getStats = () => request("/admin/stats");

// ---------------- P2 ----------------

export const getSources = () => request("/sources");

export const analyze = (articleId) =>
  USE_MOCKS
    ? Promise.resolve(analyzeMock)
    : request(`/analyze/${articleId}`);

export const compare = (topicId) =>
  USE_MOCKS
    ? Promise.resolve(compareMock)
    : request(`/compare/${topicId}`);

export const getPerspectives = (topicId) =>
  request(`/perspectives/${topicId}`);

export const getHistory = (userId) =>
  request(`/history/${userId}`);

export const addHistory = (body) =>
  request("/history", {
    method: "POST",
    body: JSON.stringify(body),
  });

// ---------------- Admin perspective terms ----------------

// List all perspective terms.
export const getAdminTerms = () =>
  request("/admin/terms");

// Create a new perspective term.
export const createTerm = (body) =>
  request("/admin/terms", {
    method: "POST",
    body: JSON.stringify(body),
  });

// Update an existing perspective term.
export const updateTerm = (termId, body) =>
  request(`/admin/terms/${termId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
