# Owner: P1
# Passwords, login tokens and role checks.
#
# How login works:
#   1. /register stores a bcrypt HASH of the password, never the password.
#   2. /login checks the password against that hash and returns a token.
#   3. The frontend sends the token on later requests:
#        Authorization: Bearer <token>
#   4. get_current_user() reads the token to find out who is calling.
#      require_admin() also checks that their role is 'admin'.
#
# The role is checked HERE in the backend. Hiding a button in the UI is
# not access control, because anyone can call the API directly.

import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
TOKEN_HOURS = 24

# auto_error=False lets us allow guests on some routes (like /search)
bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def check_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_token(user: dict) -> str:
    payload = {
        "user_id": user["user_id"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict | None:
    """The logged-in user {user_id, role}, or None for a guest."""
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"user_id": payload["user_id"], "role": payload["role"]}


def get_current_user(user: dict | None = Depends(get_optional_user)) -> dict:
    """Use on routes that need a logged-in user (reader or admin)."""
    if user is None:
        raise HTTPException(status_code=401, detail="Login required")
    return user


def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Use on admin-only routes."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user
