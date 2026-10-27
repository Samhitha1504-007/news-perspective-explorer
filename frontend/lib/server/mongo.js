// Owner: P2
// Server-only: MongoDB connection. Collections hold the semi-structured
// and event data: article_metadata (keyword arrays), search_logs,
// reading_history, comparison_sessions.
import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.MONGO_DATABASE || "news_perspective_db";

// Connect on first use and reuse the client. If MongoDB is down the
// cached attempt is dropped, so the next request tries again.
export async function mongo() {
  if (!globalThis.__npeMongo) {
    globalThis.__npeMongo = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 })
      .connect()
      .catch((err) => {
        globalThis.__npeMongo = null;
        throw err;
      });
  }
  const client = await globalThis.__npeMongo;
  return client.db(dbName);
}

// Logging must never break the page that triggered it.
export async function logQuietly(collection, document) {
  try {
    const db = await mongo();
    await db.collection(collection).insertOne(document);
  } catch (err) {
    console.error(`MongoDB ${collection} insert failed:`, err.message);
  }
}
