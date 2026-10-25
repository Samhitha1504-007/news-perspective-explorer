
from fastapi import APIRouter, Depends, HTTPException

from services.scoring_service import analyze_article
from services.auth_service import get_current_user

# Every route in this file needs a logged-in user (reader or admin).
router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/analyze/{article_id}")
def analyze(article_id: int):
    try:
        return analyze_article(article_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except Exception as exc:
        # Keep detailed database errors in the server terminal,
        # rather than returning internal details to API clients.
        print(f"Perspective analysis failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze article"
        )
