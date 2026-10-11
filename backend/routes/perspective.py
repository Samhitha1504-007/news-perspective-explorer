# Owner: P2
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/analyze/{article_id}")
def analyze(article_id: int):
    # {article_id, label, scores{positive, neutral, critical}, matched_terms[]}
    raise HTTPException(status_code=501, detail="Not implemented")
