# Owner: P1
from datetime import datetime

import pymysql
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from db.mongo import mongo_db
from db.mysql import get_connection
from services.article_service import save_article_content
from services.auth_service import require_admin
from services.scoring_service import analyze_article

router = APIRouter()


class NewArticleRequest(BaseModel):
    source_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=500)
    url: str | None = Field(default=None, max_length=1000)
    published_at: datetime | None = None
    summary: str | None = None
    content: str = Field(min_length=1)
    topic_ids: list[int] = Field(min_length=1)


@router.post("/admin/articles", status_code=201)
def create_article(body: NewArticleRequest, admin: dict = Depends(require_admin)):
    # The procedure takes topic ids as text, e.g. "1,3". set() drops duplicates.
    topic_ids = ",".join(str(topic_id) for topic_id in sorted(set(body.topic_ids)))

    # Step 1 (MySQL): sp_add_article inserts the article and its topics in
    # one transaction. If a source or topic id is wrong it rolls back.
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "CALL sp_add_article(%s, %s, %s, %s, %s, %s, @new_article_id)",
                (body.source_id, body.title.strip(), body.url, body.published_at,
                 body.summary, topic_ids),
            )
            cursor.execute("SELECT @new_article_id AS article_id")
            article_id = cursor.fetchone()["article_id"]
        connection.commit()
    except (pymysql.err.IntegrityError, pymysql.err.OperationalError) as exc:
        # FK error (bad source_id) or the procedure's own error (bad topic_id)
        raise HTTPException(status_code=400, detail=f"Article not saved: {exc.args[-1]}")
    finally:
        connection.close()

    # Step 2 (MongoDB): store the text. MySQL and MongoDB cannot share one
    # transaction, so if this fails we delete the MySQL row by hand.
    # ON DELETE CASCADE removes its article_topics rows too.
    try:
        save_article_content(article_id, body.content, body.url)
    except Exception as exc:
        print(f"MongoDB save failed, removing article {article_id}: {exc}")
        connection = get_connection()
        try:
            with connection.cursor() as cursor:
                cursor.execute("DELETE FROM articles WHERE article_id = %s", (article_id,))
            connection.commit()
        finally:
            connection.close()
        raise HTTPException(status_code=500, detail="Could not save article content")

    # Step 3: score it with P2's perspective engine so it shows a label
    # straight away. If scoring fails the article is still saved.
    label = None
    try:
        label = analyze_article(article_id)["label"]
    except Exception as exc:
        print(f"Article {article_id} saved but not scored: {exc}")

    return {"article_id": article_id, "title": body.title.strip(), "label": label}


@router.delete("/admin/articles/{article_id}")
def delete_article(article_id: int, admin: dict = Depends(require_admin)):
    # MySQL: ON DELETE CASCADE also removes the article's article_topics and
    # article_perspectives rows, so one DELETE cleans up all three tables.
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute("DELETE FROM articles WHERE article_id = %s", (article_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Article not found")
        connection.commit()
    finally:
        connection.close()

    # MongoDB has no foreign keys, so we delete the linked documents ourselves
    for collection in ["article_content", "article_metadata", "perspective_analysis", "reading_history"]:
        mongo_db[collection].delete_many({"article_id": article_id})

    return {"message": "Article deleted", "article_id": article_id}
