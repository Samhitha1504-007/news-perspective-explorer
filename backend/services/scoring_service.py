
import re
from datetime import datetime, timezone

from db.mysql import get_connection
from db.mongo import mongo_db


def analyze_article(article_id: int) -> dict:
    """Score article text using weighted terms from MySQL."""

    # 1. Fetch the article text from MongoDB.
    article = mongo_db["article_content"].find_one(
        {"article_id": article_id}
    )

    if not article or not article.get("content"):
        raise ValueError(
            f"Article {article_id} has no content in MongoDB"
        )

    content = article["content"]

    # 2. Load all configured perspective terms from MySQL.
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT
                    pt.term_id,
                    pt.term,
                    pt.weight,
                    pc.category_id,
                    pc.category_name
                FROM perspective_terms AS pt
                JOIN perspective_categories AS pc
                    ON pc.category_id = pt.category_id
                ORDER BY pt.term_id
            """)
            terms = cursor.fetchall()

        if not terms:
            raise RuntimeError("No perspective terms are configured")

        # 3. Count whole-word/phrase matches and calculate scores.
        scores = {
            "positive": 0.0,
            "neutral": 0.0,
            "critical": 0.0,
        }
        matched_terms = []

        for item in terms:
            term = item["term"]
            category = item["category_name"].lower()
            weight = float(item["weight"])

            # Escape special regex characters in configured terms.
            # Boundaries prevent matching "crisis" inside "crisis-like"
            # or "progress" inside "progressive".
            pattern = (
                r"(?<!\w)"
                + re.escape(term)
                + r"(?!\w)"
            )
            occurrences = len(
                re.findall(pattern, content, flags=re.IGNORECASE)
            )

            if occurrences == 0:
                continue

            contribution = occurrences * weight
            scores[category] += contribution

            matched_terms.append({
                "term": term,
                "category": item["category_name"],
                "count": occurrences,
                "weight": weight,
                "contribution": round(contribution, 2),
            })

        scores = {
            key: round(value, 2)
            for key, value in scores.items()
        }

        # Neutral wins ties, avoiding an arbitrary positive/critical
        # label when there is no clear score difference.
        highest = max(scores.values())
        if highest == 0:
            label = "Neutral"
        elif scores["neutral"] == highest:
            label = "Neutral"
        elif scores["positive"] == highest:
            label = "Positive"
        else:
            label = "Critical"

        # Resolve the selected label's category ID.
        category = next(
            item for item in terms
            if item["category_name"] == label
        )
        category_id = category["category_id"]

        # 4. Persist the latest analysis in MySQL.
        with connection.cursor() as cursor:
            cursor.execute("""
                INSERT INTO article_perspectives (
                    article_id,
                    category_id,
                    positive_score,
                    neutral_score,
                    critical_score,
                    needs_rescore,
                    analyzed_at
                )
                VALUES (%s, %s, %s, %s, %s, FALSE, CURRENT_TIMESTAMP)
                ON DUPLICATE KEY UPDATE
                    category_id = VALUES(category_id),
                    positive_score = VALUES(positive_score),
                    neutral_score = VALUES(neutral_score),
                    critical_score = VALUES(critical_score),
                    needs_rescore = FALSE,
                    analyzed_at = CURRENT_TIMESTAMP
            """, (
                article_id,
                category_id,
                scores["positive"],
                scores["neutral"],
                scores["critical"],
            ))

        connection.commit()

    finally:
        connection.close()

    # 5. Store detailed analysis in MongoDB.
    analyzed_at = datetime.now(timezone.utc)

    mongo_db["perspective_analysis"].update_one(
        {"article_id": article_id},
        {
            "$set": {
                "article_id": article_id,
                "label": label,
                "matched_terms": matched_terms,
                "term_weights": {
                    item["term"]: item["weight"]
                    for item in matched_terms
                },
                "raw_scores": scores,
                "analyzed_at": analyzed_at,
            }
        },
        upsert=True,
    )

    return {
        "article_id": article_id,
        "label": label,
        "scores": scores,
        "matched_terms": matched_terms,
    }
