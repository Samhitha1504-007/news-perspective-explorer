// Owner: P1
// P1  MongoDB CRUD on search_logs, from the admin page /admin/searches.
//     GET    /api/admin/search-logs   READ:   find() the latest 50 searches
//     POST   /api/admin/search-logs   CREATE: insertOne() {user_id, query, result_count}
//     DELETE /api/admin/search-logs   DELETE: deleteMany() clears all searches
// (UPDATE and deleting one log are in [log_id]/route.js.)
import { mongo } from "@/lib/server/mongo";
import { HttpError, json, readBody, requireAdmin, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  requireAdmin(request);
  const db = await mongo();
  const logs = await db.collection("search_logs").find().sort({ timestamp: -1 }).limit(50).toArray();
  return json({ logs });
});

export const POST = route(async (request) => {
  requireAdmin(request);
  const { user_id, query, result_count } = await readBody(request);
  if (!Number.isInteger(user_id) || !Number.isInteger(result_count) || !query?.trim()) {
    throw new HttpError(400, "user_id, query and result_count are required");
  }
  const db = await mongo();
  const result = await db.collection("search_logs").insertOne({
    user_id,
    query: query.trim(),
    result_count,
    timestamp: new Date(),
  });
  return json({ inserted_id: result.insertedId }, 201);
});

export const DELETE = route(async (request) => {
  requireAdmin(request);
  const db = await mongo();
  const result = await db.collection("search_logs").deleteMany({});
  return json({ deleted: result.deletedCount });
});
