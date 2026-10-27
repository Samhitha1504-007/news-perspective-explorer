// Owner: P1
// P1  GET /api/feed  articles from followed topics and sources (sp_user_feed)
import { call } from "@/lib/server/db";
import { json, requireUser, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export const GET = route(async (request) => {
  const user = requireUser(request);
  return json({ feed: await call("sp_user_feed", [user.user_id]) });
});
