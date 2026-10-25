
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from db.mongo import mongo_db

from services.compare_service import compare_topic, get_topic_perspectives
from services.auth_service import get_current_user

# Every route in this file needs a logged-in user (reader or admin).
router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/compare/{topic_id}")
def compare(topic_id: int, user: dict = Depends(get_current_user)):
    result = compare_topic(topic_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    # Record the comparison in MongoDB comparison_sessions.
    # A logging failure should not break the comparison itself.
    try:
        mongo_db["comparison_sessions"].insert_one({
            "user_id": user["user_id"],
            "topic_id": topic_id,
            "compared_sources": [source["source_name"] for source in result["sources"]],
            "timestamp": datetime.now(timezone.utc),
        })
    except Exception as exc:
        print(f"Could not log comparison: {exc}")

    return result


@router.get("/perspectives/{topic_id}")
def perspectives(topic_id: int):
    result = get_topic_perspectives(topic_id)

    if result is None:
        raise HTTPException(status_code=404, detail="Topic not found")

    return result
