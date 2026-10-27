// MongoDB CRUD demo. Creates its own documents and removes them.
//   mongosh database/mongodb/03_crud_demo.js
db = db.getSiblingDB("news_perspective_db");

print("--- CREATE");
printjson(db.reading_history.insertOne({ user_id: NumberInt(2), article_id: NumberInt(1), event_type: "demo", timestamp: new Date() }));
printjson(db.reading_history.insertMany([
  { user_id: NumberInt(2), article_id: NumberInt(2), event_type: "demo", timestamp: new Date() },
  { user_id: NumberInt(2), article_id: NumberInt(3), event_type: "demo", timestamp: new Date() },
]));

print("--- READ");
printjson(db.reading_history.find({ event_type: "demo" }, { _id: 0 }).toArray());
print("count: " + db.reading_history.countDocuments({ event_type: "demo" }));
printjson(db.article_metadata.findOne({ article_id: 1 }, { _id: 0, keywords: 1, word_count: 1 }));

print("--- UPDATE");
printjson(db.reading_history.updateOne({ event_type: "demo", article_id: 1 }, { $set: { article_id: NumberInt(5) } }));
printjson(db.reading_history.updateMany({ event_type: "demo" }, { $set: { event_type: "demo_updated" } }));
printjson(db.article_metadata.updateOne({ article_id: 1 }, { $addToSet: { keywords: "demo" } }));
printjson(db.article_metadata.updateOne({ article_id: 1 }, { $pull: { keywords: "demo" } }));

print("--- DELETE");
printjson(db.reading_history.deleteOne({ event_type: "demo_updated", article_id: 5 }));
printjson(db.reading_history.deleteMany({ event_type: "demo_updated" }));

print("--- VALIDATION (rejected: user_id and timestamp missing)");
try {
  db.reading_history.insertOne({ article_id: NumberInt(1), event_type: "demo" });
} catch (e) {
  print("Rejected: " + e.message);
}
