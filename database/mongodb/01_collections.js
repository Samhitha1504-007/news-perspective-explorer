// MongoDB collections (SHARED CONTRACT). Run with:
//   mongosh "mongodb://localhost:27017" database/mongodb/01_collections.js
//
// Rules:
// - MongoDB's own _id is the document key.
// - article_id / user_id / topic_id are the cross-database references and
//   hold the same INT values as MySQL. Never assume _id == MySQL id.
// - snake_case everywhere.

db = db.getSiblingDB("news_perspective_db");

const collections = {
  // ---------------- P1 ----------------
  article_content: {
    required: ["article_id", "content", "source_url"],
    properties: {
      article_id: { bsonType: "int" },
      content: { bsonType: "string" },
      source_url: { bsonType: "string" },
    },
  },
  article_metadata: {
    required: ["article_id", "keywords", "entities", "word_count", "tags"],
    properties: {
      article_id: { bsonType: "int" },
      keywords: { bsonType: "array" },
      entities: { bsonType: "array" },
      word_count: { bsonType: "int" },
      tags: { bsonType: "array" },
    },
  },
  search_logs: {
    required: ["query", "result_count", "timestamp"],
    properties: {
      user_id: { bsonType: ["int", "null"] }, // null for guest searches
      query: { bsonType: "string" },
      result_count: { bsonType: "int" },
      timestamp: { bsonType: "date" },
    },
  },

  // ---------------- P2 ----------------
  perspective_analysis: {
    required: ["article_id", "label", "matched_terms", "term_weights", "raw_scores", "analyzed_at"],
    properties: {
      article_id: { bsonType: "int" },
      label: { enum: ["Positive", "Neutral", "Critical"] },
      matched_terms: { bsonType: "array" },
      term_weights: { bsonType: ["object", "array"] },
      raw_scores: { bsonType: "object" },
      analyzed_at: { bsonType: "date" },
    },
  },
  reading_history: {
    required: ["user_id", "article_id", "event_type", "timestamp"],
    properties: {
      user_id: { bsonType: "int" },
      article_id: { bsonType: "int" },
      event_type: { bsonType: "string" },
      timestamp: { bsonType: "date" },
    },
  },
  comparison_sessions: {
    required: ["user_id", "topic_id", "compared_sources", "timestamp"],
    properties: {
      user_id: { bsonType: "int" },
      topic_id: { bsonType: "int" },
      compared_sources: { bsonType: "array" },
      timestamp: { bsonType: "date" },
    },
  },
};

for (const [name, schema] of Object.entries(collections)) {
  if (!db.getCollectionNames().includes(name)) {
    db.createCollection(name, { validator: { $jsonSchema: { bsonType: "object", ...schema } } });
    print(`created ${name}`);
  }
}
