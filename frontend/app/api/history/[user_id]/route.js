// Owner: P2
// P2  GET /api/history/:userId  a reader sees only their own history;
// an admin can see anyone's. Events from MongoDB, titles from MySQL.
import { query } from "@/lib/server/db";
import { mongo } from "@/lib/server/mongo";
import { HttpError, json, requireUser, route, toInt } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request, { params }) => {
  const user = requireUser(request);
  const userId = toInt(params.user_id, "user id");
  if (user.user_id !== userId && user.role !== "admin") {
    throw new HttpError(403, "You can only see your own history");
  }

  let events;
  try {
    events = await (await mongo()).collection("reading_history")
      .find({ user_id: userId }).sort({ timestamp: -1 }).limit(100).toArray();
  } catch {
    throw new HttpError(503, "MongoDB is not available");
  }

  const ids = [...new Set(events.map((e) => e.article_id))];
  const titles = {};
  if (ids.length) {
    const rows = await query("SELECT article_id, title FROM articles WHERE article_id IN (?)", [ids]);
    for (const row of rows) titles[row.article_id] = row.title;
  }
  const history = events.map((e) => ({
    article_id: e.article_id,
    title: titles[e.article_id] || "Article unavailable",
    event_type: e.event_type,
    timestamp: e.timestamp,
  }));
  return json({ user_id: userId, count: history.length, history });
});
