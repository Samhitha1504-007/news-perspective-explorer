// Owner: P2
// P1  GET /api/keywords/:id  keyword array from MongoDB article_metadata
import { mongo } from "@/lib/server/mongo";
import { HttpError, json, requireUser, route, toInt } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request, { params }) => {
  requireUser(request);
  const id = toInt(params.article_id, "article id");
  let doc;
  try {
    doc = await (await mongo()).collection("article_metadata").findOne({ article_id: id });
  } catch {
    throw new HttpError(503, "MongoDB is not available");
  }
  return json({ article_id: id, keywords: doc?.keywords || [], word_count: doc?.word_count ?? null });
});
