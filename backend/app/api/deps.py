import uuid
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_supabase_jwt
from app.db.session import get_db
from app.models.attendee import Attendee
from app.models.event import Event
from app.models.user import User

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """Validate Supabase JWT and return the corresponding User row."""
    payload = decode_supabase_jwt(credentials.credentials)
    supabase_id = payload.get("sub")
    if not supabase_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user_id = uuid.UUID(supabase_id)
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None:
        # Auto-create on first authenticated call
        email = payload.get("email", "")
        user = User(
            id=user_id,
            email=email,
            display_name=payload.get("user_metadata", {}).get("full_name"),
            avatar_url=payload.get("user_metadata", {}).get("avatar_url"),
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    return user


async def get_attendee_from_device_token(
    x_device_token: Annotated[str | None, Header()] = None,
    x_event_slug: Annotated[str | None, Header()] = None,
    db: Annotated[AsyncSession, Depends(get_db)] = None,
) -> Attendee:
    """Validate device token header for attendee-authenticated endpoints."""
    if not x_device_token or not x_event_slug:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing device token or event slug")

    try:
        device_token = uuid.UUID(x_device_token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid device token format")

    result = await db.execute(
        select(Attendee)
        .join(Event, Attendee.event_id == Event.id)
        .where(Event.slug == x_event_slug)
        .where(Attendee.device_token == device_token)
    )
    attendee = result.scalar_one_or_none()
    if attendee is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Attendee not found for this event")
    return attendee


CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentAttendee = Annotated[Attendee, Depends(get_attendee_from_device_token)]
DB = Annotated[AsyncSession, Depends(get_db)]
