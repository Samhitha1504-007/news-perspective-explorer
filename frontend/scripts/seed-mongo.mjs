// Owner: P2
// Fills MongoDB from MySQL. Run from the frontend folder after the MySQL
// scripts and the two mongosh scripts:
//   npm run seed:mongo
// 1. article_metadata: keywords + word count for every article
// 2. a few demo reading_history / search_logs / comparison_sessions events,
//    so the History and Stats pages are not empty on a fresh install.
import mysql from "mysql2/promise";
import { MongoClient } from "mongodb";
import { extractKeywords, countWords } from "../lib/server/keywords.js";

const sql = await mysql.createConnection({
  host: process.env.MYSQL_HOST || "localhost",
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_READER_USER,
  password: process.env.MYSQL_READER_PASSWORD,
  database: process.env.MYSQL_DATABASE || "news_perspective_db",
});
const client = await new MongoClient(process.env.MONGO_URI || "mongodb://localhost:27017").connect();
const db = client.db(process.env.MONGO_DATABASE || "news_perspective_db");

const [articles] = await sql.query("SELECT article_id, content FROM articles ORDER BY article_id");
for (const a of articles) {
  await db.collection("article_metadata").updateOne(
    { article_id: a.article_id },
    { $set: { article_id: a.article_id, keywords: extractKeywords(a.content), word_count: countWords(a.content), updated_at: new Date() } },
    { upsert: true }
  );
}
console.log(`article_metadata: ${articles.length} articles`);

const [users] = await sql.query("SELECT user_id FROM users WHERE email IN ('reader1@example.com','reader2@example.com') ORDER BY user_id");
const [topics] = await sql.query("SELECT topic_id FROM topics ORDER BY topic_id");
const [sources] = await sql.query("SELECT source_name FROM sources ORDER BY source_name");
const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000);

if ((await db.collection("reading_history").countDocuments()) === 0) {
  const views = [];
  users.forEach((u, i) => articles.slice(i * 3, i * 3 + 5).forEach((a, k) =>
    views.push({ user_id: u.user_id, article_id: a.article_id, event_type: "view", timestamp: hoursAgo(10 - k) })));
  await db.collection("reading_history").insertMany(views);
  console.log(`reading_history: ${views.length} demo views`);
}
if ((await db.collection("search_logs").countDocuments()) === 0) {
  const queries = [["COP28", 3], ["fossil fuels", 3], ["mpox", 3], ["election", 3], ["AI Act", 3], ["mpox", 3]];
  await db.collection("search_logs").insertMany(queries.map(([q, n], i) => ({
    user_id: users[i % users.length].user_id, query: q, result_count: n, timestamp: hoursAgo(20 - i),
  })));
  console.log(`search_logs: ${queries.length} demo searches`);
}
if ((await db.collection("comparison_sessions").countDocuments()) === 0) {
  await db.collection("comparison_sessions").insertMany(topics.slice(0, 3).map((t, i) => ({
    user_id: users[i % users.length].user_id, topic_id: t.topic_id,
    compared_sources: sources.map((s) => s.source_name), timestamp: hoursAgo(5 - i),
  })));
  console.log("comparison_sessions: 3 demo comparisons");
}

await sql.end();
await client.close();
