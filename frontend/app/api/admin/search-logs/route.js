// Owner: P1
// P1  Admin view of everyone's searches (MongoDB search_logs).
//     GET    /api/admin/search-logs   READ:   find() the latest 50
//     DELETE /api/admin/search-logs   DELETE: deleteMany() clears all logs
// (Deleting one log is in [log_id]/route.js.)
import { mongo } from "@/lib/server/mongo";
import { json, requireAdmin, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  requireAdmin(request);
  const db = await mongo();
  const logs = await db.collection("search_logs").find().sort({ timestamp: -1 }).limit(50).toArray();
  return json({ logs });
});

export const DELETE = route(async (request) => {
  requireAdmin(request);
  const db = await mongo();
  const result = await db.collection("search_logs").deleteMany({});
  return json({ deleted: result.deletedCount });
});
