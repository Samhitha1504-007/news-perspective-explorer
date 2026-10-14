// Viva MongoDB queries: 3 per person from own module.
db = db.getSiblingDB("news_perspective_db");

// =========================== P1 =====================================
// P1-M1: find one article's content by article_id (a simple lookup that
// uses the unique index on article_id).
db.article_content.find({ article_id: 1 }, { _id: 0, article_id: 1, content: 1 });

// P1-M2: array field. Find articles whose keywords array contains "crisis",
// then list the most common keywords across all articles ($unwind splits
// the array into one document per keyword).
db.article_metadata.find({ keywords: "crisis" }, { _id: 0, article_id: 1, keywords: 1 });

db.article_metadata.aggregate([
  { $unwind: "$keywords" },
  { $group: { _id: "$keywords", articles: { $sum: 1 } } },
  { $sort: { articles: -1 } },
  { $limit: 10 },
]);

// P1-M3: most popular searches. Group search_logs by query text, count how
// often each was searched and the average number of results.
db.search_logs.aggregate([
  { $group: {
      _id: { $toLower: "$query" },
      times_searched: { $sum: 1 },
      avg_results: { $avg: "$result_count" },
      last_searched: { $max: "$timestamp" },
  } },
  { $sort: { times_searched: -1 } },
  { $limit: 10 },
]);

// =========================== P2 =====================================
// P2-M1:
