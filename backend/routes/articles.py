# Owner: P1
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/articles/{article_id}")
def get_article(article_id: int):
    # article_id, title, source{source_id, source_name, website},
    # topics[{topic_id, topic_name}], published_at, summary,
    # content (from MongoDB article_content).
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/keywords/{article_id}")
def get_keywords(article_id: int):
    # {article_id, keywords[]} from MongoDB article_metadata.
    raise HTTPException(status_code=501, detail="Not implemented")
