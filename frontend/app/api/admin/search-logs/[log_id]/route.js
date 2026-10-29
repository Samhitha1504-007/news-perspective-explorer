// Owner: P1
// P1  DELETE /api/admin/search-logs/:id  admin deletes one search log (deleteOne)
import { ObjectId } from "mongodb";
import { mongo } from "@/lib/server/mongo";
import { HttpError, json, requireAdmin, route } from "@/lib/server/auth";

export const DELETE = route(async (request, { params }) => {
  requireAdmin(request);
  if (!ObjectId.isValid(params.log_id)) throw new HttpError(400, "Invalid log id");
  const db = await mongo();
  const result = await db.collection("search_logs").deleteOne({ _id: new ObjectId(params.log_id) });
  if (result.deletedCount === 0) throw new HttpError(404, "Log not found");
  return json({ deleted: true });
});
