// Indexes on each collection; justify each one in the report.
db = db.getSiblingDB("news_perspective_db");

// ---------------- P1 ----------------
// article_content: every article page looks up content by article_id.
// unique = one content document per MySQL article.
db.article_content.createIndex({ article_id: 1 }, { unique: true });

// article_metadata: GET /keywords/{article_id} looks up by article_id.
db.article_metadata.createIndex({ article_id: 1 }, { unique: true });

// article_metadata: multikey index on the keywords array, so
// "find articles with keyword X" does not scan every document.
db.article_metadata.createIndex({ keywords: 1 });

// search_logs: "a user's recent searches" filters by user_id and sorts
// by timestamp, so one compound index covers both.
db.search_logs.createIndex({ user_id: 1, timestamp: -1 });

// ---------------- P2 ----------------
// perspective_analysis: one analysis per article, looked up by article_id.
db.perspective_analysis.createIndex({ article_id: 1 }, { unique: true });

// perspective_analysis: "all Critical articles" filters by label.
db.perspective_analysis.createIndex({ label: 1 });

// reading_history: GET /history/{user_id} filters by user and sorts newest
// first, so one compound index serves the whole query.
db.reading_history.createIndex({ user_id: 1, timestamp: -1 });

// reading_history: "views per article" groups by article_id.
db.reading_history.createIndex({ article_id: 1 });

// comparison_sessions: "which topics are compared most" groups by topic_id.
db.comparison_sessions.createIndex({ topic_id: 1 });
