
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.auth_service import get_current_user
from services.history_service import (
    add_reading_event,
    get_reading_history,
)

router = APIRouter()


def check_own_history(user: dict, user_id: int):
    """Readers may only use their own history. Admins may see anyone's."""
    if user["user_id"] != user_id and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="You can only access your own history")


class ReadingEventRequest(BaseModel):
    user_id: int = Field(gt=0)
    article_id: int = Field(gt=0)
    event_type: str = Field(min_length=1, max_length=100)


@router.get("/history/{user_id}")
def get_history(user_id: int, user: dict = Depends(get_current_user)):
    check_own_history(user, user_id)
    try:
        return get_reading_history(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.post("/history")
def add_history(body: ReadingEventRequest, user: dict = Depends(get_current_user)):
    check_own_history(user, body.user_id)
    try:
        return add_reading_event(
            user_id=body.user_id,
            article_id=body.article_id,
            event_type=body.event_type,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
