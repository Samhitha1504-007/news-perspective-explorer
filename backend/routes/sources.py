
from fastapi import APIRouter, HTTPException
from db.mysql import get_connection

router = APIRouter()


@router.get("/sources")
def list_sources():
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT source_id, source_name, website, country
                FROM sources
                ORDER BY source_name
            """)
            sources = cursor.fetchall()

        return {
            "count": len(sources),
            "sources": sources
        }

    except Exception as exc:
        print(f"Error fetching sources: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Could not fetch sources"
        )

    finally:
        if connection:
            connection.close()
