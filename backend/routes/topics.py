# Owner: P1
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/topics")
def list_topics():
    # [{topic_id, topic_name, description}]
    raise HTTPException(status_code=501, detail="Not implemented")
