// CRUD demo for the presentation: Create, Read, Update, Delete on MongoDB.
// Works on reading_history with a marker event_type, and removes its own
// documents at the end, so it can be run any number of times:
//   mongosh database/mongodb/04_crud_demo.js
//
// NumberInt(...) stores a real integer. Plain numbers in mongosh are
// decimals, and the collection validator expects int for the ids.

db = db.getSiblingDB("news_perspective_db");
const history = db.reading_history;

history.deleteMany({ event_type: { $in: ["crud-demo", "crud-demo-updated"] } });

// ------------------------------------------------------------------
// C = CREATE   insertOne / insertMany
// ------------------------------------------------------------------
print("\n--- CREATE");
const created = history.insertOne({
  user_id: NumberInt(2),
  article_id: NumberInt(1),
  event_type: "crud-demo",
  timestamp: new Date(),
});
print("insertOne gave _id:", created.insertedId);

history.insertMany([
  { user_id: NumberInt(2), article_id: NumberInt(2), event_type: "crud-demo", timestamp: new Date() },
  { user_id: NumberInt(3), article_id: NumberInt(2), event_type: "crud-demo", timestamp: new Date() },
]);

// ------------------------------------------------------------------
// R = READ   find / findOne / countDocuments
// ------------------------------------------------------------------
print("\n--- READ");
printjson(history.find({ event_type: "crud-demo" }, { _id: 0 }).toArray());
printjson(history.findOne({ _id: created.insertedId }));
print("demo documents for user 2:", history.countDocuments({ event_type: "crud-demo", user_id: NumberInt(2) }));

// ------------------------------------------------------------------
// U = UPDATE   updateOne / updateMany with $set
// ------------------------------------------------------------------
print("\n--- UPDATE");
const one = history.updateOne({ _id: created.insertedId }, { $set: { article_id: NumberInt(3) } });
print("updateOne matched", one.matchedCount, "modified", one.modifiedCount);

const many = history.updateMany({ event_type: "crud-demo" }, { $set: { event_type: "crud-demo-updated" } });
print("updateMany modified", many.modifiedCount);
printjson(history.find({ event_type: "crud-demo-updated" }, { _id: 0, user_id: 1, article_id: 1, event_type: 1 }).toArray());

// ------------------------------------------------------------------
// D = DELETE   deleteOne / deleteMany
// ------------------------------------------------------------------
print("\n--- DELETE");
print("deleteOne removed", history.deleteOne({ _id: created.insertedId }).deletedCount);
print("deleteMany removed", history.deleteMany({ event_type: "crud-demo-updated" }).deletedCount);
print("demo documents left:", history.countDocuments({ event_type: /^crud-demo/ }));

// ------------------------------------------------------------------
// Validation: the schema from 01_collections.js rejects a bad document
// ------------------------------------------------------------------
print("\n--- VALIDATION");
try {
  history.insertOne({ article_id: NumberInt(1), event_type: "crud-demo" }); // no user_id, no timestamp
  print("inserted (validator is not installed)");
} catch (error) {
  print("rejected as expected:", error.message);
}
