// All backend calls go through here so endpoint paths live in one place.
// Paths and JSON keys follow the Shared API Contract exactly.
import analyzeMock from "@/mocks/analyze_12.json";
import articleMock from "@/mocks/article_12.json";
import compareMock from "@/mocks/compare_1.json";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

// ---------------- P1 ----------------
export const register = (body) => request("/register", { method: "POST", body: JSON.stringify(body) });
export const login = (body) => request("/login", { method: "POST", body: JSON.stringify(body) });
export const getTopics = () => request("/topics");
export const search = (query) => request(`/search?query=${encodeURIComponent(query)}`);
export const getArticle = (articleId) =>
  USE_MOCKS ? Promise.resolve(articleMock) : request(`/articles/${articleId}`);
export const getKeywords = (articleId) => request(`/keywords/${articleId}`);
export const createArticle = (body) => request("/admin/articles", { method: "POST", body: JSON.stringify(body) });

// ---------------- P2 ----------------
export const getSources = () => request("/sources");
export const analyze = (articleId) =>
  USE_MOCKS ? Promise.resolve(analyzeMock) : request(`/analyze/${articleId}`);
export const compare = (topicId) =>
  USE_MOCKS ? Promise.resolve(compareMock) : request(`/compare/${topicId}`);
export const getPerspectives = (topicId) => request(`/perspectives/${topicId}`);
export const getHistory = (userId) => request(`/history/${userId}`);
export const addHistory = (body) => request("/history", { method: "POST", body: JSON.stringify(body) });
export const updateTerm = (termId, body) =>
  request(`/admin/terms/${termId}`, { method: "PUT", body: JSON.stringify(body) });
