# Owner: P1
# Admin dashboard numbers: counts and GROUP BY from MySQL, aggregations
# from MongoDB.
from fastapi import APIRouter, Depends

from db.mongo import mongo_db
from db.mysql import get_connection
from services.auth_service import require_admin

router = APIRouter()


@router.get("/admin/stats")
def get_stats(admin: dict = Depends(require_admin)):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            # One row of totals, using a scalar subquery for each table
            cursor.execute("""
                SELECT
                    (SELECT COUNT(*) FROM users)    AS users,
                    (SELECT COUNT(*) FROM articles) AS articles,
                    (SELECT COUNT(*) FROM sources)  AS sources,
                    (SELECT COUNT(*) FROM topics)   AS topics
            """)
            totals = cursor.fetchone()

            # Articles per source, split by perspective label.
            # LEFT JOINs keep sources that have no articles yet (count 0).
            # category_name = 'Positive' is 1 or 0, so SUM() counts matches.
            cursor.execute("""
                SELECT
                    s.source_name,
                    COUNT(a.article_id) AS articles,
                    COALESCE(SUM(pc.category_name = 'Positive'), 0) AS positive,
                    COALESCE(SUM(pc.category_name = 'Neutral'), 0)  AS neutral,
                    COALESCE(SUM(pc.category_name = 'Critical'), 0) AS critical
                FROM sources AS s
                LEFT JOIN articles AS a ON a.source_id = s.source_id
                LEFT JOIN article_perspectives AS ap ON ap.article_id = a.article_id
                LEFT JOIN perspective_categories AS pc ON pc.category_id = ap.category_id
                GROUP BY s.source_id, s.source_name
                ORDER BY articles DESC, s.source_name
            """)
            by_source = cursor.fetchall()

            # MongoDB: the 5 most opened articles, counted from reading_history
            most_viewed = list(mongo_db["reading_history"].aggregate([
                {"$group": {"_id": "$article_id", "views": {"$sum": 1}}},
                {"$sort": {"views": -1}},
                {"$limit": 5},
            ]))

            # Their titles live in MySQL, matched by the same article_id
            titles = {}
            if most_viewed:
                ids = [row["_id"] for row in most_viewed]
                placeholders = ", ".join(["%s"] * len(ids))
                cursor.execute(
                    f"SELECT article_id, title FROM articles WHERE article_id IN ({placeholders})",
                    tuple(ids),
                )
                titles = {row["article_id"]: row["title"] for row in cursor.fetchall()}
    finally:
        connection.close()

    # MongoDB: the 5 most common searches (same idea as viva query P1-M3)
    top_searches = list(mongo_db["search_logs"].aggregate([
        {"$group": {"_id": {"$toLower": "$query"}, "times": {"$sum": 1}}},
        {"$sort": {"times": -1}},
        {"$limit": 5},
    ]))

    return {
        "totals": {
            **totals,
            "searches": mongo_db["search_logs"].count_documents({}),
            "article_views": mongo_db["reading_history"].count_documents({}),
        },
        "by_source": [
            {**row, "positive": int(row["positive"]), "neutral": int(row["neutral"]),
             "critical": int(row["critical"])}
            for row in by_source
        ],
        "top_searches": [{"query": row["_id"], "times": row["times"]} for row in top_searches],
        "most_viewed": [
            {"article_id": row["_id"], "title": titles.get(row["_id"], "Article unavailable"),
             "views": row["views"]}
            for row in most_viewed
        ],
    }
