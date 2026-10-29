// Owner: P1
// P1  A reader's own search history, in the MongoDB collection search_logs.
//     CREATE: every search inserts one (insertOne in /api/search)
//     GET    /api/search-history   READ:   find() my searches, pinned first
//     DELETE /api/search-history   DELETE: deleteMany() clears my history
// (UPDATE = pin, and deleting one, are in [log_id]/route.js.)
import { mongo } from "@/lib/server/mongo";
import { json, requireUser, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const user = requireUser(request);
  const db = await mongo();
  const searches = await db.collection("search_logs")
    .find({ user_id: user.user_id })
    .sort({ pinned: -1, timestamp: -1 })
    .limit(10)
    .toArray();
  return json({ searches });
});

export const DELETE = route(async (request) => {
  const user = requireUser(request);
  const db = await mongo();
  const result = await db.collection("search_logs").deleteMany({ user_id: user.user_id });
  return json({ deleted: result.deletedCount });
});
