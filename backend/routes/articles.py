# Owner: P1
from fastapi import APIRouter, Depends, HTTPException

from db.mongo import mongo_db
from db.mysql import get_connection
from services.article_service import get_topics_for_articles
from services.auth_service import get_current_user

# Every route in this file needs a logged-in user (reader or admin).
router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/articles/{article_id}")
def get_article(article_id: int):
    # Structured fields come from MySQL...
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT a.article_id, a.title, a.url, a.published_at, a.summary,
                       s.source_id, s.source_name, s.website
                FROM articles AS a
                JOIN sources AS s ON s.source_id = a.source_id
                WHERE a.article_id = %s
                """,
                (article_id,),
            )
            article = cursor.fetchone()
            if article is None:
                raise HTTPException(status_code=404, detail="Article not found")

            topics = get_topics_for_articles(cursor, [article_id])[article_id]
    finally:
        connection.close()

    # ...and the full text comes from MongoDB, linked by the same article_id
    content_doc = mongo_db["article_content"].find_one({"article_id": article_id})

    return {
        "article_id": article["article_id"],
        "title": article["title"],
        "url": article["url"],
        "source": {
            "source_id": article["source_id"],
            "source_name": article["source_name"],
            "website": article["website"],
        },
        "topics": topics,
        "published_at": article["published_at"],
        "summary": article["summary"],
        "content": content_doc["content"] if content_doc else None,
    }


@router.get("/articles/{article_id}/related")
def get_related_articles(article_id: int):
    """Other articles on the same topic(s), preferring other sources.

    Self-join: article_topics is joined to itself. `mine` holds this
    article's topics, `other` finds every other article with one of
    those topics.
    """
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT DISTINCT
                    a.article_id, a.title, a.published_at,
                    s.source_name,
                    pc.category_name AS label,
                    (a.source_id = this.source_id) AS same_source
                FROM article_topics AS mine
                JOIN article_topics AS other
                    ON other.topic_id = mine.topic_id
                   AND other.article_id <> mine.article_id
                JOIN articles AS a ON a.article_id = other.article_id
                JOIN articles AS this ON this.article_id = mine.article_id
                JOIN sources AS s ON s.source_id = a.source_id
                LEFT JOIN article_perspectives AS ap ON ap.article_id = a.article_id
                LEFT JOIN perspective_categories AS pc ON pc.category_id = ap.category_id
                WHERE mine.article_id = %s
                ORDER BY same_source, a.published_at DESC
                LIMIT 5
                """,
                (article_id,),
            )
            rows = cursor.fetchall()
    finally:
        connection.close()

    return {
        "article_id": article_id,
        "related": [
            {key: row[key] for key in ("article_id", "title", "published_at", "source_name", "label")}
            for row in rows
        ],
    }


@router.get("/keywords/{article_id}")
def get_keywords(article_id: int):
    metadata = mongo_db["article_metadata"].find_one({"article_id": article_id})
    if metadata is None:
        raise HTTPException(status_code=404, detail="No keywords for this article")

    return {"article_id": article_id, "keywords": metadata["keywords"]}
