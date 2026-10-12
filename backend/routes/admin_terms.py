
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator, model_validator

from db.mysql import get_connection
from services.scoring_service import analyze_article

router = APIRouter()


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


@router.put("/admin/terms/{term_id}")
def update_term(term_id: int, body: TermUpdateRequest):
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

        # The trigger flags existing analyses when the term is updated.
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
