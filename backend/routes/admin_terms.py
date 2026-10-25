
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from db.mysql import get_connection
from services.auth_service import require_admin
from services.scoring_service import analyze_article

router = APIRouter()


class TermCreateRequest(BaseModel):
    term: str = Field(min_length=1, max_length=100)
    category_id: int = Field(gt=0)
    weight: float = Field(gt=0)

    @field_validator("term")
    @classmethod
    def clean_term(cls, value):
        value = value.strip()
        if not value:
            raise ValueError("Term cannot be blank")
        return value


class TermUpdateRequest(BaseModel):
    term: str | None = Field(default=None, min_length=1, max_length=100)
    category_id: int | None = Field(default=None, gt=0)
    weight: float | None = Field(default=None, gt=0)

    @field_validator("term")
    @classmethod
    def clean_term(cls, value):
        if value is not None:
            value = value.strip()
            if not value:
                raise ValueError("Term cannot be blank")
        return value

    @model_validator(mode="after")
    def require_at_least_one_change(self):
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")

        for field_name in self.model_fields_set:
            if getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")

        return self


@router.get("/admin/terms")
def get_admin_terms(admin: dict = Depends(require_admin)):
    """Return all perspective terms and their categories for administrators."""
    connection = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    pt.term_id,
                    pt.term,
                    pt.category_id,
                    pc.category_name,
                    pt.weight
                FROM perspective_terms AS pt
                JOIN perspective_categories AS pc
                    ON pc.category_id = pt.category_id
                ORDER BY pc.category_name, pt.term
                """
            )
            terms = cursor.fetchall()

        return terms

    except Exception as exc:
        print(f"Error retrieving perspective terms: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Could not retrieve perspective terms",
        )
    finally:
        if connection:
            connection.close()


@router.post("/admin/terms", status_code=201)
def create_term(
    body: TermCreateRequest,
    admin: dict = Depends(require_admin),
):
    """Create a perspective term. Administrators only."""
    connection = None
    term_id = None

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT category_id FROM perspective_categories "
                "WHERE category_id = %s",
                (body.category_id,),
            )
            if not cursor.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="Invalid category_id",
                )

            cursor.execute(
                "SELECT term_id FROM perspective_terms WHERE term = %s",
                (body.term,),
            )
            if cursor.fetchone():
                raise HTTPException(
                    status_code=400,
                    detail="That perspective term already exists",
                )

            cursor.execute(
                """
                INSERT INTO perspective_terms (term, category_id, weight)
                VALUES (%s, %s, %s)
                """,
                (body.term, body.category_id, body.weight),
            )
            term_id = cursor.lastrowid

        connection.commit()

        # Find analyses flagged by the database for re-scoring.
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT article_id FROM article_perspectives "
                "WHERE needs_rescore = TRUE ORDER BY article_id"
            )
            article_ids = [row["article_id"] for row in cursor.fetchall()]

    except HTTPException:
        if connection:
            connection.rollback()
        raise
    except Exception as exc:
        if connection:
            connection.rollback()
        print(f"Error creating perspective term: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Could not create perspective term",
        )
    finally:
        if connection:
            connection.close()

    rescored = []
    failures = []

    for article_id in article_ids:
        try:
            analyze_article(article_id)
            rescored.append(article_id)
        except Exception as exc:
            print(f"Could not rescore article {article_id}: {exc}")
            failures.append({
                "article_id": article_id,
                "reason": str(exc),
            })

    return {
        "message": (
            "Term created and selected articles re-scored"
            if not failures
            else "Term created, but some articles could not be re-scored"
        ),
        "term_id": term_id,
        "term": body.term,
        "category_id": body.category_id,
        "weight": body.weight,
        "rescored_count": len(rescored),
        "rescored_article_ids": rescored,
        "rescore_failures": failures,
    }


@router.put("/admin/terms/{term_id}")
def update_term(
    term_id: int,
    body: TermUpdateRequest,
    admin: dict = Depends(require_admin),
):
    connection = None
    updates = body.model_dump(exclude_unset=True)

    try:
        connection = get_connection()

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT term_id FROM perspective_terms WHERE term_id = %s",
                (term_id,),
            )
            if not cursor.fetchone():
                raise HTTPException(status_code=404, detail="Term not found")

            if "category_id" in updates:
                cursor.execute(
                    "SELECT category_id FROM perspective_categories "
                    "WHERE category_id = %s",
                    (updates["category_id"],),
                )
                if not cursor.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid category_id",
                    )

            if "term" in updates:
                cursor.execute(
                    "SELECT term_id FROM perspective_terms "
                    "WHERE term = %s AND term_id <> %s",
                    (updates["term"], term_id),
                )
                if cursor.fetchone():
                    raise HTTPException(
                        status_code=400,
                        detail="That perspective term already exists",
                    )

            fields = list(updates)
            assignments = ", ".join(f"{field} = %s" for field in fields)
            values = [updates[field] for field in fields]

            cursor.execute(
                f"UPDATE perspective_terms SET {assignments} "
                "WHERE term_id = %s",
                (*values, term_id),
            )

        connection.commit()

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT article_id FROM article_perspectives "
                "WHERE needs_rescore = TRUE ORDER BY article_id"
            )
            article_ids = [row["article_id"] for row in cursor.fetchall()]

    except HTTPException:
        if connection:
            connection.rollback()
        raise
    except Exception as exc:
        if connection:
            connection.rollback()
        print(f"Error updating perspective term: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Could not update perspective term",
        )
    finally:
        if connection:
            connection.close()

    rescored = []
    failures = []

    for article_id in article_ids:
        try:
            analyze_article(article_id)
            rescored.append(article_id)
        except Exception as exc:
            print(f"Could not rescore article {article_id}: {exc}")
            failures.append({
                "article_id": article_id,
                "reason": str(exc),
            })

    return {
        "message": (
            "Term updated and all selected articles re-scored"
            if not failures
            else "Term updated, but some articles could not be re-scored"
        ),
        "term_id": term_id,
        "updated_fields": updates,
        "rescored_count": len(rescored),
        "rescored_article_ids": rescored,
        "rescore_failures": failures,
    }


@router.delete("/admin/terms/{term_id}")
def delete_term(term_id: int, admin: dict = Depends(require_admin)):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            # The AFTER DELETE trigger flags every analysis with needs_rescore
            cursor.execute("DELETE FROM perspective_terms WHERE term_id = %s", (term_id,))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail="Term not found")
        connection.commit()

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT article_id FROM article_perspectives WHERE needs_rescore = TRUE"
            )
            article_ids = [row["article_id"] for row in cursor.fetchall()]
    finally:
        connection.close()

    # Re-score the flagged articles without the deleted word
    rescored = 0
    for article_id in article_ids:
        try:
            analyze_article(article_id)
            rescored += 1
        except Exception as exc:
            print(f"Could not rescore article {article_id}: {exc}")

    return {"message": "Term deleted and articles re-scored", "term_id": term_id,
            "rescored_count": rescored}
