# Owner: P1
# Fills MongoDB article_content + article_metadata, then scores every
# article. Run after the MySQL seed:
#     python seed_content.py
#
# Why Python and not a mongosh script: article_id values are
# AUTO_INCREMENT ids that only MySQL knows, so we look each article up
# by its title to get the right article_id.

import json
from pathlib import Path

from db.mysql import get_connection
from services.article_service import save_article_content
from services.scoring_service import analyze_article

CONTENT_FILE = Path(__file__).parent.parent / "database" / "mongodb" / "article_content.json"


def main():
    articles = json.loads(CONTENT_FILE.read_text())

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            for item in articles:
                cursor.execute(
                    "SELECT article_id, url FROM articles WHERE title = %s",
                    (item["title"],),
                )
                row = cursor.fetchone()
                if row is None:
                    print(f"Skipped (not in MySQL): {item['title']}")
                    continue

                save_article_content(row["article_id"], item["content"], row["url"])
                result = analyze_article(row["article_id"])
                print(f"Article {row['article_id']}: {result['label']:8}  {item['title']}")
    finally:
        connection.close()


if __name__ == "__main__":
    main()
