# Owner: P1
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/admin/articles")
def create_article():
    # Admin only. CALL sp_add_article(...).
    raise HTTPException(status_code=501, detail="Not implemented")
