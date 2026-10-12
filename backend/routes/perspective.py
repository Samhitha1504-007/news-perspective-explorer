
from fastapi import APIRouter, HTTPException

from services.scoring_service import analyze_article

router = APIRouter()


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
