// Owner: P1
// P1  GET /api/search?query=...  FULLTEXT search, logged to MongoDB
import { query } from "@/lib/server/db";
import { logQuietly } from "@/lib/server/mongo";
import { HttpError, json, requireUser, route } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

// An article matches if:
//  1. MATCH ... AGAINST finds the words (uses the FULLTEXT index), or
//  2. the title or a topic name contains the text as a whole word (REGEXP \b...\b).
//     Needed for words under 3 letters such as "AI", which FULLTEXT skips.
const SEARCH_SQL = `
  SELECT d.article_id, d.title, d.published_at, d.source_id, d.source_name,
         d.topics, d.label,
         MATCH(a.title, a.summary, a.content) AGAINST(?) AS relevance
  FROM articles AS a
  JOIN v_article_details AS d ON d.article_id = a.article_id
  WHERE MATCH(a.title, a.summary, a.content) AGAINST(? IN BOOLEAN MODE)
     OR a.title REGEXP ?
     OR d.topics REGEXP ?
  ORDER BY relevance DESC, a.published_at DESC`;

export const GET = route(async (request) => {
  const user = requireUser(request);
  const raw = new URL(request.url).searchParams.get("query") || "";
  // Keep letters, digits and spaces: + - * " have special meanings in BOOLEAN MODE
  const words = raw.replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!words) throw new HttpError(400, "Enter a search term");

  const wholeWord = `\\b${words}\\b`;
  const articles = await query(SEARCH_SQL, [words, words, wholeWord, wholeWord]);

  await logQuietly("search_logs", {
    user_id: user.user_id,
    query: raw,
    result_count: articles.length,
    timestamp: new Date(),
  });
  return json({ query: raw, count: articles.length, articles });
});
