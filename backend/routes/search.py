# Owner: P1
import re
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from db.mongo import mongo_db
from db.mysql import get_connection
from services.article_service import get_topics_for_articles
from services.auth_service import get_optional_user

router = APIRouter()

# An article matches if ANY of these is true:
#   1. FULLTEXT: MATCH(title, summary) AGAINST the search words
#   2. its title contains the search text as a whole word (REGEXP with
#      \b word boundaries). Needed because MySQL's FULLTEXT index skips
#      words shorter than 3 letters, such as "AI". LIKE '%AI%' would not
#      work here: it also matches "raises".
#   3. one of its topics' names contains the text as a whole word,
#      e.g. "Elections"
# Results are ranked by the FULLTEXT relevance score, newest first on ties.
SEARCH_SQL = """
    SELECT
        a.article_id,
        a.title,
        a.published_at,
        s.source_id,
        s.source_name,
        pc.category_name AS label,
        MATCH(a.title, a.summary) AGAINST(%s) AS relevance
    FROM articles AS a
    JOIN sources AS s
        ON s.source_id = a.source_id
    LEFT JOIN article_perspectives AS ap
        ON ap.article_id = a.article_id
    LEFT JOIN perspective_categories AS pc
        ON pc.category_id = ap.category_id
    WHERE MATCH(a.title, a.summary) AGAINST(%s IN BOOLEAN MODE)
       OR a.title REGEXP %s
       OR a.article_id IN (
            SELECT at.article_id
            FROM article_topics AS at
            JOIN topics AS t ON t.topic_id = at.topic_id
            WHERE t.topic_name REGEXP %s
       )
    ORDER BY relevance DESC, a.published_at DESC
"""


@router.get("/search")
def search(query: str, user: dict | None = Depends(get_optional_user)):
    # Keep only letters, digits and spaces. Symbols like + - * " have
    # special meanings in BOOLEAN MODE and could break the query.
    words = re.sub(r"[^\w\s]", " ", query).strip()
    if not words:
        raise HTTPException(status_code=400, detail="Enter a search term")

    whole_word = rf"\b{words}\b"
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(SEARCH_SQL, (words, words, whole_word, whole_word))
            rows = cursor.fetchall()
            topics = get_topics_for_articles(cursor, [row["article_id"] for row in rows])
    finally:
        connection.close()

    articles = [
        {
            "article_id": row["article_id"],
            "title": row["title"],
            "source_id": row["source_id"],
            "source_name": row["source_name"],
            "topics": topics[row["article_id"]],
            "published_at": row["published_at"],
            "label": row["label"],  # None until the article has been analyzed
        }
        for row in rows
    ]

    # Log the search in MongoDB. user_id is None for guests.
    # A logging failure should not break the search itself.
    try:
        mongo_db["search_logs"].insert_one({
            "user_id": user["user_id"] if user else None,
            "query": query,
            "result_count": len(articles),
            "timestamp": datetime.now(timezone.utc),
        })
    except Exception as exc:
        print(f"Could not log search: {exc}")

    return {"query": query, "count": len(articles), "articles": articles}
