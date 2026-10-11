# Owner: P2
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/history/{user_id}")
def get_history(user_id: int):
    # Recent reading_history events: article_id, title, event_type, timestamp.
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/history")
def add_history():
    # Body: user_id, article_id, event_type.
    raise HTTPException(status_code=501, detail="Not implemented")
