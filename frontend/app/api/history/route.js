// Owner: P2
// P2  POST /api/history  {article_id, event_type}  record a view in MongoDB.
// The user comes from the token, never from the request body.
import { query } from "@/lib/server/db";
import { mongo } from "@/lib/server/mongo";
import { HttpError, json, readBody, requireUser, route, toInt } from "@/lib/server/auth";

export const POST = route(async (request) => {
  const user = requireUser(request);
  const body = await readBody(request);
  const articleId = toInt(body.article_id, "article id");
  const eventType = String(body.event_type || "view").slice(0, 50);

  const [exists] = await query("SELECT 1 AS ok FROM articles WHERE article_id = ?", [articleId]);
  if (!exists) throw new HttpError(404, "Article not found");

  try {
    await (await mongo()).collection("reading_history").insertOne({
      user_id: user.user_id,
      article_id: articleId,
      event_type: eventType,
      timestamp: new Date(),
    });
  } catch {
    throw new HttpError(503, "MongoDB is not available");
  }
  return json({ saved: true }, 201);
});
