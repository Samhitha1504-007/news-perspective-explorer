// Owner: P1
// P1  One search in my history (MongoDB search_logs).
//     PUT    /api/search-history/:id {pinned}  UPDATE: updateOne() pin / unpin it
//     DELETE /api/search-history/:id           DELETE: deleteOne()
// Both filter on user_id too, so a reader can only change their own searches.
import { ObjectId } from "mongodb";
import { mongo } from "@/lib/server/mongo";
import { HttpError, json, readBody, requireUser, route } from "@/lib/server/auth";

// MongoDB ids are 24 hex characters (ObjectId), not numbers.
function toObjectId(value) {
  if (!ObjectId.isValid(value)) throw new HttpError(400, "Invalid search id");
  return new ObjectId(value);
}

export const PUT = route(async (request, { params }) => {
  const user = requireUser(request);
  const { pinned } = await readBody(request);
  const db = await mongo();
  const result = await db.collection("search_logs").updateOne(
    { _id: toObjectId(params.log_id), user_id: user.user_id },
    { $set: { pinned: Boolean(pinned) } }
  );
  if (result.matchedCount === 0) throw new HttpError(404, "Search not found");
  return json({ pinned: Boolean(pinned) });
});

export const DELETE = route(async (request, { params }) => {
  const user = requireUser(request);
  const db = await mongo();
  const result = await db.collection("search_logs").deleteOne({
    _id: toObjectId(params.log_id),
    user_id: user.user_id,
  });
  if (result.deletedCount === 0) throw new HttpError(404, "Search not found");
  return json({ deleted: true });
});
