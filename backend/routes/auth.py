# Owner: P1
from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/register")
def register():
    # Return user_id, name, role. Never return password_hash.
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/login")
def login():
    # Return the agreed token + user_id + role.
    raise HTTPException(status_code=501, detail="Not implemented")
