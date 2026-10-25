
from fastapi import APIRouter, Depends, HTTPException

from services.compare_service import compare_topic, get_topic_perspectives
from services.auth_service import get_current_user

# Every route in this file needs a logged-in user (reader or admin).
router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/compare/{topic_id}")
def compare(topic_id: int):
    result = compare_topic(topic_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    return result


@router.get("/perspectives/{topic_id}")
def perspectives(topic_id: int):
    result = get_topic_perspectives(topic_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    return result
