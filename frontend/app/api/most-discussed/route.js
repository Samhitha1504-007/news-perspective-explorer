// Owner: P1
// P1  GET /api/most-discussed  top 5 articles by comments + bookmarks,
// worked out by the procedure sp_most_discussed. Shown on the home page.
import { call } from "@/lib/server/db";
import { json, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async () => {
  return json({ articles: await call("sp_most_discussed", [5]) });
});
