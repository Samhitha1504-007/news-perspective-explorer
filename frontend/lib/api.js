// Owner: P1 + P2 (shared)
/* Browser side: every call to our own Next.js API goes through here.
   The API lives in app/api/** in this same project, so paths start with /api. */

// ---------------- Login session ----------------
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
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });
  const data = res.headers.get("content-type")?.includes("application/json") ? await res.json() : null;

  // 401 = not logged in or token expired: go to login and come back after.
  if (res.status === 401 && path !== "/login") {
    logout();
    const here = window.location.pathname + window.location.search;
    window.location.href = `/login?next=${encodeURIComponent(here)}`;
    return new Promise(() => {});
  }
  if (!res.ok) {
    throw new Error(typeof data?.detail === "string" ? data.detail : `Request failed (${res.status})`);
  }
  return data;
}

const post = (path, body) => request(path, { method: "POST", body: JSON.stringify(body ?? {}) });
const put = (path, body) => request(path, { method: "PUT", body: JSON.stringify(body ?? {}) });
const del = (path) => request(path, { method: "DELETE" });

// ---------------- P1: accounts, articles, search ----------------
export const register = (body) => post("/register", body);
export const login = (body) => post("/login", body);
export const getTopics = () => request("/topics");
export const search = (query) => request(`/search?query=${encodeURIComponent(query)}`);
export const getArticle = (id) => request(`/articles/${id}`);
export const getKeywords = (id) => request(`/keywords/${id}`);
export const getRelated = (id) => request(`/articles/${id}/related`);
export const createArticle = (body) => post("/admin/articles", body);
export const deleteArticle = (id) => del(`/admin/articles/${id}`);
export const getStats = () => request("/admin/stats");

// ---------------- P1: reader features ----------------
export const getBookmarks = () => request("/bookmarks");
export const addBookmark = (articleId) => post("/bookmarks", { article_id: articleId });
export const removeBookmark = (articleId) => del(`/bookmarks/${articleId}`);

export const getFollows = () => request("/follows");
export const followTopic = (id) => post(`/follows/topics/${id}`);
export const unfollowTopic = (id) => del(`/follows/topics/${id}`);
export const followSource = (id) => post(`/follows/sources/${id}`);
export const unfollowSource = (id) => del(`/follows/sources/${id}`);
export const getFeed = () => request("/feed");

export const getComments = (articleId) => request(`/articles/${articleId}/comments`);
export const addComment = (articleId, body) => post(`/articles/${articleId}/comments`, { body });
export const deleteComment = (commentId) => del(`/comments/${commentId}`);

// ---------------- P2: perspective, comparison, history ----------------
export const getSources = () => request("/sources");
export const analyze = (id) => request(`/analyze/${id}`);
export const compare = (topicId) => request(`/compare/${topicId}`);
export const getPerspectives = (topicId) => request(`/perspectives/${topicId}`);
export const getHistory = (userId) => request(`/history/${userId}`);
export const addHistory = (body) => post("/history", body);

export const setFeedback = (articleId, vote, suggestedLabel) =>
  put(`/articles/${articleId}/feedback`, { vote, suggested_label: suggestedLabel || null });
export const clearFeedback = (articleId) => del(`/articles/${articleId}/feedback`);

export const getAdminTerms = () => request("/admin/terms");
export const createTerm = (body) => post("/admin/terms", body);
export const updateTerm = (termId, body) => put(`/admin/terms/${termId}`, body);
export const deleteTerm = (termId) => del(`/admin/terms/${termId}`);
