// MongoDB collections with $jsonSchema validators. Run:
//   mongosh database/mongodb/01_collections.js
// Re-running updates the validators (collMod) instead of failing.
//
// MongoDB holds the semi-structured and event data; MySQL holds the
// entities and relationships. They are linked by the same integer ids
// (article_id, user_id, topic_id); MongoDB's own _id is never used as a link.
db = db.getSiblingDB("news_perspective_db");

const INT = { bsonType: ["int", "long"] };

const collections = {
  // P1: keywords extracted from each article's text (an array per article)
  article_metadata: {
    required: ["article_id", "keywords", "word_count"],
    properties: {
      article_id: INT,
      keywords: { bsonType: "array", items: { bsonType: "string" } },
      word_count: INT,
    },
  },
  // P1: one document per search
  search_logs: {
    required: ["user_id", "query", "result_count", "timestamp"],
    properties: {
      user_id: INT,
      query: { bsonType: "string" },
      result_count: INT,
      timestamp: { bsonType: "date" },
      pinned: { bsonType: "bool" }, // optional: the reader pinned this search
    },
  },
  // P2: one document per article view
  reading_history: {
    required: ["user_id", "article_id", "event_type", "timestamp"],
    properties: {
      user_id: INT,
      article_id: INT,
      event_type: { bsonType: "string" },
      timestamp: { bsonType: "date" },
    },
  },
  // P2: one document per comparison page visit, with the sources compared
  comparison_sessions: {
    required: ["user_id", "topic_id", "compared_sources", "timestamp"],
    properties: {
      user_id: INT,
      topic_id: INT,
      compared_sources: { bsonType: "array", items: { bsonType: "string" } },
      timestamp: { bsonType: "date" },
    },
  },
};

for (const [name, schema] of Object.entries(collections)) {
  const validator = { $jsonSchema: { bsonType: "object", ...schema } };
  if (db.getCollectionNames().includes(name)) {
    db.runCommand({ collMod: name, validator });
    print(`updated validator: ${name}`);
  } else {
    db.createCollection(name, { validator });
    print(`created: ${name}`);
  }
}
