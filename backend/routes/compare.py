# Owner: P2
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/compare/{topic_id}")
def compare(topic_id: int):
    # Reads v_source_perspective_summary.
    # {topic_id, topic, sources[{source_id, source_name, article_count,
    #  positive, neutral, critical}]}
    raise HTTPException(status_code=501, detail="Not implemented")


@router.get("/perspectives/{topic_id}")
def perspectives(topic_id: int):
    # {topic_id, totals/distribution for Positive, Neutral, Critical}
    raise HTTPException(status_code=501, detail="Not implemented")
