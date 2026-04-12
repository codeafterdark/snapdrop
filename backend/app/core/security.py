from functools import lru_cache
from typing import Any

import httpx
from fastapi import HTTPException, status
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


@lru_cache(maxsize=1)
def _fetch_jwks() -> dict:
    url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()


def decode_supabase_jwt(token: str) -> dict[str, Any]:
    try:
        headers = jwt.get_unverified_headers(token)
        alg = headers.get("alg", "HS256")
        kid = headers.get("kid")

        if alg in ("ES256", "RS256"):
            jwks = _fetch_jwks()
            key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
            if key is None:
                # Key may have rotated — refresh cache and retry once
                _fetch_jwks.cache_clear()
                jwks = _fetch_jwks()
                key = next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)
            if key is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Unknown signing key",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            payload = jwt.decode(token, key, algorithms=[alg], audience="authenticated")
        else:
            # Legacy HS256 path
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
