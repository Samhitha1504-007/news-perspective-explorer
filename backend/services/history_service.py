
from datetime import datetime, timezone

from db.mysql import get_connection
from db.mongo import mongo_db


def _mysql_exists(query: str, value: int) -> bool:
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(query, (value,))
            return cursor.fetchone() is not None
    finally:
        connection.close()


def add_reading_event(
    user_id: int,
    article_id: int,
    event_type: str,
) -> dict:
    """Validate MySQL references and record one event in MongoDB."""

    if not _mysql_exists(
        "SELECT user_id FROM users WHERE user_id = %s",
        user_id,
    ):
        raise ValueError(f"User {user_id} not found")

    if not _mysql_exists(
        "SELECT article_id FROM articles WHERE article_id = %s",
        article_id,
    ):
        raise ValueError(f"Article {article_id} not found")

    event_type = event_type.strip()
    if not event_type or len(event_type) > 100:
        raise ValueError("event_type must contain 1 to 100 characters")

    timestamp = datetime.now(timezone.utc)

    document = {
        "user_id": user_id,
        "article_id": article_id,
        "event_type": event_type,
        "timestamp": timestamp,
    }

    result = mongo_db["reading_history"].insert_one(document)

    return {
        "message": "Reading event recorded",
        "event_id": str(result.inserted_id),
        "user_id": user_id,
        "article_id": article_id,
        "event_type": event_type,
        "timestamp": timestamp.isoformat(),
    }


def get_reading_history(user_id: int, limit: int = 100) -> dict:
    """Return the latest reading events with article titles."""

    if not _mysql_exists(
        "SELECT user_id FROM users WHERE user_id = %s",
        user_id,
    ):
        raise ValueError(f"User {user_id} not found")

    events = list(
        mongo_db["reading_history"]
        .find({"user_id": user_id})
        .sort("timestamp", -1)
        .limit(limit)
    )

    article_ids = list({
        event["article_id"] for event in events
    })

    titles = {}

    if article_ids:
        connection = get_connection()
        try:
            placeholders = ", ".join(["%s"] * len(article_ids))
            query = (
                f"SELECT article_id, title FROM articles "
                f"WHERE article_id IN ({placeholders})"
            )

            with connection.cursor() as cursor:
                cursor.execute(query, tuple(article_ids))
                for row in cursor.fetchall():
                    titles[row["article_id"]] = row["title"]
        finally:
            connection.close()

    items = []

    for event in events:
        items.append({
            "article_id": event["article_id"],
            "title": titles.get(
                event["article_id"], "Article unavailable"
            ),
            "event_type": event["event_type"],
            "timestamp": event["timestamp"].isoformat(),
        })

    return {
        "user_id": user_id,
        "count": len(items),
        "history": items,
    }
