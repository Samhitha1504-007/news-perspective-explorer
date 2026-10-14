# Owner: P1
import pymysql
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db.mysql import get_connection
from services.auth_service import check_password, create_token, hash_password

router = APIRouter()


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=255)
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/register", status_code=201)
def register(body: RegisterRequest):
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email")

    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            # Everyone who signs up is a reader. Admins are created in
            # the seed data, so nobody can make themselves an admin.
            cursor.execute(
                "INSERT INTO users (name, email, password_hash, role) "
                "VALUES (%s, %s, %s, 'reader')",
                (body.name.strip(), email, hash_password(body.password)),
            )
            user_id = cursor.lastrowid
        connection.commit()
    except pymysql.err.IntegrityError:
        # The UNIQUE constraint on users.email rejected a duplicate
        raise HTTPException(status_code=409, detail="Email already registered")
    finally:
        connection.close()

    # Never send password_hash back
    return {"user_id": user_id, "name": body.name.strip(), "role": "reader"}


@router.post("/login")
def login(body: LoginRequest):
    connection = get_connection()
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT user_id, name, password_hash, role FROM users WHERE email = %s",
                (body.email.strip().lower(),),
            )
            user = cursor.fetchone()
    finally:
        connection.close()

    # Same message for "no such email" and "wrong password", so the
    # response does not reveal which emails are registered.
    if user is None or not check_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Wrong email or password")

    return {
        "token": create_token(user),
        "user_id": user["user_id"],
        "name": user["name"],
        "role": user["role"],
    }
