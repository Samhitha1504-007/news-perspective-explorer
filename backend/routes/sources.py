# Owner: P2
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.get("/sources")
def list_sources():
    # [{source_id, source_name, website, country}]
    raise HTTPException(status_code=501, detail="Not implemented")
