// Seed documents. article_id values MUST match rows in MySQL `articles`.
// Use NumberInt(...) so ids are stored as int, not double.
db = db.getSiblingDB("news_perspective_db");

// P1: article_content and article_metadata are NOT seeded here.
// Their article_id values are AUTO_INCREMENT ids from MySQL, which this
// script cannot know. Run this instead (after the MySQL seed):
//   cd backend && python seed_content.py
// It reads database/mongodb/article_content.json, looks up each
// article_id by title, and fills both collections.

// P2: perspective_analysis is NOT seeded here either. seed_content.py runs
// the scoring engine on every article, which writes it (and the MySQL
// article_perspectives rows) with real scores.

// P2: sample activity so the history page and the aggregations have data
// before anyone uses the website. Ids used:
//   users 2 and 3 = reader1 and reader2 (from 06_seed_data.sql)
//   articles 1-5  = the first five seeded articles
//   topics 1-5    = the five seeded topics
// NumberInt() stores a real integer; plain numbers in mongosh are decimals,
// which the collection validators in 01_collections.js would reject.
// deleteMany first, so running this script twice does not duplicate data.
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

db.reading_history.deleteMany({ user_id: { $in: [NumberInt(2), NumberInt(3)] } });
db.reading_history.insertMany([
  { user_id: NumberInt(2), article_id: NumberInt(1), event_type: "view", timestamp: daysAgo(3) },
  { user_id: NumberInt(2), article_id: NumberInt(4), event_type: "view", timestamp: daysAgo(2) },
  { user_id: NumberInt(2), article_id: NumberInt(1), event_type: "view", timestamp: daysAgo(1) },
  { user_id: NumberInt(3), article_id: NumberInt(3), event_type: "view", timestamp: daysAgo(2) },
  { user_id: NumberInt(3), article_id: NumberInt(5), event_type: "view", timestamp: daysAgo(1) },
]);

db.comparison_sessions.deleteMany({ user_id: { $in: [NumberInt(2), NumberInt(3)] } });
db.comparison_sessions.insertMany([
  { user_id: NumberInt(2), topic_id: NumberInt(2), compared_sources: ["Al Jazeera", "Associated Press", "Reuters", "The Guardian"], timestamp: daysAgo(2) },
  { user_id: NumberInt(3), topic_id: NumberInt(2), compared_sources: ["Al Jazeera", "Associated Press", "Reuters", "The Guardian"], timestamp: daysAgo(1) },
  { user_id: NumberInt(3), topic_id: NumberInt(5), compared_sources: ["Al Jazeera", "BBC News", "Reuters"], timestamp: daysAgo(1) },
]);

print(`reading_history: ${db.reading_history.countDocuments()} documents`);
print(`comparison_sessions: ${db.comparison_sessions.countDocuments()} documents`);
