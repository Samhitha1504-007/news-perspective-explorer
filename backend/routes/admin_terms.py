# Owner: P2
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.put("/admin/terms/{term_id}")
def update_term(term_id: int):
    # Admin only. UPDATE perspective_terms -> trigger flags needs_rescore,
    # then re-score flagged articles.
    raise HTTPException(status_code=501, detail="Not implemented")
