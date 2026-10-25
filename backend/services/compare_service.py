
from db.mysql import get_connection


def compare_topic(topic_id: int) -> dict:
    """Compare source-level perspective scores for one topic."""
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT topic_id, topic_name, source_id, source_name,
                       article_count, positive, neutral, critical
                FROM v_source_perspective_summary
                WHERE topic_id = %s
                ORDER BY source_name
                """,
                (topic_id,),
            )
            rows = cursor.fetchall()

            if not rows:
                cursor.execute(
                    "SELECT topic_id, topic_name FROM topics WHERE topic_id = %s",
                    (topic_id,),
                )
                topic = cursor.fetchone()

                if not topic:
                    return None

                return {
                    "topic_id": topic_id,
                    "topic": topic["topic_name"],
                    "sources": [],
                }

            return {
                "topic_id": topic_id,
                "topic": rows[0]["topic_name"],
                "sources": [
                    {
                        "source_id": row["source_id"],
                        "source_name": row["source_name"],
                        "article_count": row["article_count"],
                        "positive": float(row["positive"]),
                        "neutral": float(row["neutral"]),
                        "critical": float(row["critical"]),
                    }
                    for row in rows
                ],
            }
    finally:
        connection.close()


def get_topic_perspectives(topic_id: int) -> dict:
    """Return the article count and label distribution for a topic."""
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    t.topic_name,
                    COUNT(DISTINCT a.article_id) AS total_articles,
                    COUNT(DISTINCT CASE
                        WHEN pc.category_name = 'Positive'
                        THEN a.article_id END) AS positive,
                    COUNT(DISTINCT CASE
                        WHEN pc.category_name = 'Neutral'
                        THEN a.article_id END) AS neutral,
                    COUNT(DISTINCT CASE
                        WHEN pc.category_name = 'Critical'
                        THEN a.article_id END) AS critical
                FROM topics AS t
                LEFT JOIN article_topics AS at
                    ON at.topic_id = t.topic_id
                LEFT JOIN articles AS a
                    ON a.article_id = at.article_id
                LEFT JOIN article_perspectives AS ap
                    ON ap.article_id = a.article_id
                LEFT JOIN perspective_categories AS pc
                    ON pc.category_id = ap.category_id
                WHERE t.topic_id = %s
                GROUP BY t.topic_id, t.topic_name
                """,
                (topic_id,),
            )
            row = cursor.fetchone()

            if not row:
                return None

            return {
                "topic_id": topic_id,
                "topic": row["topic_name"],
                "total_articles": row["total_articles"],
                "distribution": {
                    "positive": row["positive"],
                    "neutral": row["neutral"],
                    "critical": row["critical"],
                },
            }
    finally:
        connection.close()
