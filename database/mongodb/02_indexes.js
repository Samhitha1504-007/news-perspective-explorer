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
// TODO(P2): perspective_analysis(article_id unique), reading_history(user_id, timestamp),
//           comparison_sessions(topic_id)
