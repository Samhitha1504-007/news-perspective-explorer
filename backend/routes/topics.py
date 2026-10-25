# Owner: P1
from fastapi import APIRouter

from db.mysql import get_connection

router = APIRouter()


@router.get("/topics")
def list_topics():
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT topic_id, topic_name, description FROM topics ORDER BY topic_name"
            )
            return cursor.fetchall()
    finally:
        connection.close()
