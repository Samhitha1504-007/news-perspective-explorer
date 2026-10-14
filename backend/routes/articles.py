# Owner: P1
from fastapi import APIRouter, HTTPException

from db.mongo import mongo_db
from db.mysql import get_connection
from services.article_service import get_topics_for_articles

router = APIRouter()


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


@router.get("/keywords/{article_id}")
def get_keywords(article_id: int):
    metadata = mongo_db["article_metadata"].find_one({"article_id": article_id})
    if metadata is None:
        raise HTTPException(status_code=404, detail="No keywords for this article")

    return {"article_id": article_id, "keywords": metadata["keywords"]}
