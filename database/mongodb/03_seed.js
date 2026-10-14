// Seed documents. article_id values MUST match rows in MySQL `articles`.
// Use NumberInt(...) so ids are stored as int, not double.
db = db.getSiblingDB("news_perspective_db");

// P1: article_content and article_metadata are NOT seeded here.
// Their article_id values are AUTO_INCREMENT ids from MySQL, which this
// script cannot know. Run this instead (after the MySQL seed):
//   cd backend && python seed_content.py
// It reads database/mongodb/article_content.json, looks up each
// article_id by title, and fills both collections.
// TODO(P2): perspective_analysis, reading_history, comparison_sessions
