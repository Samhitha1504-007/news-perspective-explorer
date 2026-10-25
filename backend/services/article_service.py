# Owner: P1
# Helpers shared by the article routes and seed_content.py.

from db.mongo import mongo_db
from services.keyword_service import count_words, extract_keywords


def get_topics_for_articles(cursor, article_ids: list) -> dict:
    """Return {article_id: [{topic_id, topic_name}, ...]} for the given ids."""
    topics = {article_id: [] for article_id in article_ids}
    if not article_ids:
        return topics

    placeholders = ", ".join(["%s"] * len(article_ids))
    cursor.execute(
        f"""
        SELECT at.article_id, t.topic_id, t.topic_name
        FROM article_topics AS at
        JOIN topics AS t ON t.topic_id = at.topic_id
        WHERE at.article_id IN ({placeholders})
        ORDER BY t.topic_name
        """,
        tuple(article_ids),
    )
    for row in cursor.fetchall():
        topics[row["article_id"]].append(
            {"topic_id": row["topic_id"], "topic_name": row["topic_name"]}
        )
    return topics


def save_article_content(article_id: int, content: str, source_url: str | None) -> None:
    """Store the article text and its keywords in MongoDB.

    Uses upsert (update, or insert if missing) so running it twice for
    the same article does not create duplicates.
    """
    mongo_db["article_content"].update_one(
        {"article_id": article_id},
        {"$set": {"article_id": article_id, "content": content, "source_url": source_url or ""}},
        upsert=True,
    )
    mongo_db["article_metadata"].update_one(
        {"article_id": article_id},
        {"$set": {
            "article_id": article_id,
            "keywords": extract_keywords(content),
            "entities": [],
            "word_count": count_words(content),
            "tags": [],
        }},
        upsert=True,
    )
