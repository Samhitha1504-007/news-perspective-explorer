// Indexes, each with its reason. Run: mongosh database/mongodb/02_indexes.js
db = db.getSiblingDB("news_perspective_db");

// ---------------- P1 ----------------
// One metadata document per article; the article page looks it up by id.
db.article_metadata.createIndex({ article_id: 1 }, { unique: true });
// Multikey index on an array: "articles with keyword X" without a full scan.
db.article_metadata.createIndex({ keywords: 1 });
// A user's searches, newest first: one compound index covers filter + sort.
db.search_logs.createIndex({ user_id: 1, timestamp: -1 });

// ---------------- P2 ----------------
// A user's history page: filter by user, newest first.
db.reading_history.createIndex({ user_id: 1, timestamp: -1 });
// Most-viewed articles: group by article_id.
db.reading_history.createIndex({ article_id: 1 });
// Comparisons per topic.
db.comparison_sessions.createIndex({ topic_id: 1, timestamp: -1 });

print("indexes created");
