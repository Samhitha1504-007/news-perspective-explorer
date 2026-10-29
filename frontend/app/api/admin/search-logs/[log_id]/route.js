// Owner: P1
// P1  MongoDB CRUD on one search_logs document.
//     PUT    /api/admin/search-logs/:id   UPDATE: updateOne() $set the query text
//     DELETE /api/admin/search-logs/:id   DELETE: deleteOne()
import { ObjectId } from "mongodb";
import { mongo } from "@/lib/server/mongo";
import { HttpError, json, readBody, requireAdmin, route } from "@/lib/server/auth";

// MongoDB ids are 24 hex characters (ObjectId), not numbers.
function toObjectId(value) {
  if (!ObjectId.isValid(value)) throw new HttpError(400, "Invalid log id");
  return new ObjectId(value);
}

export const PUT = route(async (request, { params }) => {
  requireAdmin(request);
  const { query } = await readBody(request);
  if (!query?.trim()) throw new HttpError(400, "Query cannot be empty");
  const db = await mongo();
  const result = await db.collection("search_logs").updateOne(
    { _id: toObjectId(params.log_id) },
    { $set: { query: query.trim() } }
  );
  if (result.matchedCount === 0) throw new HttpError(404, "Log not found");
  return json({ updated: true });
});

export const DELETE = route(async (request, { params }) => {
  requireAdmin(request);
  const db = await mongo();
  const result = await db.collection("search_logs").deleteOne({ _id: toObjectId(params.log_id) });
  if (result.deletedCount === 0) throw new HttpError(404, "Log not found");
  return json({ deleted: true });
});
