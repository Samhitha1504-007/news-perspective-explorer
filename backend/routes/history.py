
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.history_service import (
    add_reading_event,
    get_reading_history,
)

router = APIRouter()


class ReadingEventRequest(BaseModel):
    user_id: int = Field(gt=0)
    article_id: int = Field(gt=0)
    event_type: str = Field(min_length=1, max_length=100)


@router.get("/history/{user_id}")
def get_history(user_id: int):
    try:
        return get_reading_history(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/history")
def add_history(body: ReadingEventRequest):
    try:
        return add_reading_event(
            user_id=body.user_id,
            article_id=body.article_id,
            event_type=body.event_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
