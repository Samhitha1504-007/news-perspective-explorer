// Viva MongoDB queries: 3 per person. Paste into mongosh, or run:
//   mongosh database/mongodb/aggregations.js
db = db.getSiblingDB("news_perspective_db");

// =========================== P1 =====================================
// P1-M1: array query. Articles whose keywords array contains "fossil",
// using the multikey index on keywords.
printjson(db.article_metadata.find({ keywords: "fossil" }, { _id: 0, article_id: 1, keywords: 1 }).toArray());

// P1-M2: $unwind. The 10 most common keywords across all articles.
printjson(db.article_metadata.aggregate([
  { $unwind: "$keywords" },
  { $group: { _id: "$keywords", articles: { $sum: 1 } } },
  { $sort: { articles: -1, _id: 1 } },
  { $limit: 10 },
]).toArray());

// P1-M3: most popular searches with the average number of results.
printjson(db.search_logs.aggregate([
  { $group: { _id: { $toLower: "$query" }, times: { $sum: 1 }, avg_results: { $avg: "$result_count" } } },
  { $sort: { times: -1 } },
  { $limit: 10 },
]).toArray());

// =========================== P2 =====================================
// P2-M1: one reader's latest views (uses the {user_id, timestamp} index).
printjson(db.reading_history.find({ user_id: 2 }).sort({ timestamp: -1 }).limit(5).toArray());

// P2-M2: most viewed articles.
printjson(db.reading_history.aggregate([
  { $match: { event_type: "view" } },
  { $group: { _id: "$article_id", views: { $sum: 1 }, readers: { $addToSet: "$user_id" } } },
  { $project: { views: 1, unique_readers: { $size: "$readers" } } },
  { $sort: { views: -1 } },
  { $limit: 5 },
]).toArray());

// P2-M3: which topics are compared most, and by how many different readers.
printjson(db.comparison_sessions.aggregate([
  { $group: { _id: "$topic_id", comparisons: { $sum: 1 }, users: { $addToSet: "$user_id" } } },
  { $project: { comparisons: 1, unique_users: { $size: "$users" } } },
  { $sort: { comparisons: -1 } },
]).toArray());
