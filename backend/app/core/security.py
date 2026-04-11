from typing import Any
import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


def decode_supabase_jwt(token: str) -> dict[str, Any]:
    """
    Decode and validate a Supabase-issued JWT using the project's JWT secret.
    Returns the payload dict on success, raises 401 on any failure.
    """
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
