# Owner: P1
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/search")
def search(query: str):
    # FULLTEXT MATCH(title, summary) AGAINST(...). Return article cards:
    # article_id, title, source_id, source_name, topics, published_at,
    # label (if article_perspectives has a row). Log to search_logs.
    raise HTTPException(status_code=501, detail="Not implemented")
