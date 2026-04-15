import secrets
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, DB
from app.models.collaborator import EventCollaborator
from app.models.event import Event
from app.schemas.collaborator import CollaboratorPublic, InviteCreate, InviteInfo
from app.services import email_service

router = APIRouter(tags=["collaborators"])


def _collab_to_public(c: EventCollaborator) -> CollaboratorPublic:
    return CollaboratorPublic(
        id=c.id,
        invited_email=c.invited_email,
        user_id=c.user_id,
        display_name=c.user.display_name if c.user else None,
        avatar_url=c.user.avatar_url if c.user else None,
        status=c.status,
        invited_at=c.invited_at,
        accepted_at=c.accepted_at,
    )


async def _require_accepted_access(event_id: uuid.UUID, current_user, db) -> bool:
    """Return True if owner, False if accepted collaborator. Raises 404 if no access."""
    result = await db.execute(select(Event).where(Event.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.owner_id == current_user.id:
        return True
    collab_result = await db.execute(
        select(EventCollaborator)
        .where(EventCollaborator.event_id == event_id)
        .where(EventCollaborator.user_id == current_user.id)
        .where(EventCollaborator.status == "accepted")
    )
    if collab_result.scalar_one_or_none():
        return False
    raise HTTPException(status_code=404, detail="Event not found")


# ── Invite ─────────────────────────────────────────────────────────────────────

@router.post(
    "/events/{event_id}/collaborators/invite",
    response_model=CollaboratorPublic,
    status_code=status.HTTP_201_CREATED,
)
async def invite_collaborator(
    event_id: uuid.UUID,
    body: InviteCreate,
    current_user: CurrentUser,
    db: DB,
):
    """Owner-only: invite a co-admin by email."""
    event_result = await db.execute(
        select(Event).where(Event.id == event_id).where(Event.owner_id == current_user.id)
    )
    event = event_result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    email = body.email.lower().strip()
    if email == current_user.email.lower():
        raise HTTPException(status_code=400, detail="You are already the event owner")

    existing_result = await db.execute(
        select(EventCollaborator)
        .where(EventCollaborator.event_id == event_id)
        .where(EventCollaborator.invited_email == email)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This email has already been invited")

    token = secrets.token_urlsafe(32)
    collab = EventCollaborator(
        event_id=event_id,
        invited_by_id=current_user.id,
        invited_email=email,
        invite_token=token,
        status="pending",
    )
    db.add(collab)
    await db.commit()
    await db.refresh(collab)

    inviter_name = current_user.display_name or current_user.email
    email_service.send_invite_email(email, inviter_name, event.name, token)

    return _collab_to_public(collab)


# ── List collaborators ─────────────────────────────────────────────────────────

@router.get("/events/{event_id}/collaborators", response_model=list[CollaboratorPublic])
async def list_collaborators(event_id: uuid.UUID, current_user: CurrentUser, db: DB):
    """Owner or accepted collaborator: list everyone with access."""
    await _require_accepted_access(event_id, current_user, db)

    result = await db.execute(
        select(EventCollaborator)
        .options(selectinload(EventCollaborator.user))
        .where(EventCollaborator.event_id == event_id)
        .order_by(EventCollaborator.invited_at)
    )
    return [_collab_to_public(c) for c in result.scalars().all()]


# ── Remove collaborator ────────────────────────────────────────────────────────

@router.delete("/events/{event_id}/collaborators/{collaborator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_collaborator(
    event_id: uuid.UUID,
    collaborator_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
):
    """Owner-only: revoke access for a collaborator."""
    event_result = await db.execute(
        select(Event).where(Event.id == event_id).where(Event.owner_id == current_user.id)
    )
    if not event_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Event not found")

    collab_result = await db.execute(
        select(EventCollaborator)
        .where(EventCollaborator.id == collaborator_id)
        .where(EventCollaborator.event_id == event_id)
    )
    collab = collab_result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Collaborator not found")

    await db.delete(collab)
    await db.commit()


# ── Public invite endpoints ────────────────────────────────────────────────────

@router.get("/invites/{token}", response_model=InviteInfo)
async def get_invite(token: str, db: DB):
    """Public: fetch invite details to display on the accept page."""
    result = await db.execute(
        select(EventCollaborator)
        .options(selectinload(EventCollaborator.event), selectinload(EventCollaborator.invited_by))
        .where(EventCollaborator.invite_token == token)
    )
    collab = result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Invite not found")

    return InviteInfo(
        event_id=collab.event_id,
        event_name=collab.event.name,
        invited_by_name=collab.invited_by.display_name or collab.invited_by.email,
        status=collab.status,
    )


@router.post("/invites/{token}/accept")
async def accept_invite(token: str, current_user: CurrentUser, db: DB):
    """Authenticated: accept a pending invite."""
    result = await db.execute(
        select(EventCollaborator)
        .options(selectinload(EventCollaborator.event))
        .where(EventCollaborator.invite_token == token)
    )
    collab = result.scalar_one_or_none()
    if not collab:
        raise HTTPException(status_code=404, detail="Invite not found")

    if collab.status == "accepted":
        return {"event_id": str(collab.event_id)}

    if collab.event.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="You are already the event owner")

    # Prevent duplicate collaborator rows for the same user
    dup_result = await db.execute(
        select(EventCollaborator)
        .where(EventCollaborator.event_id == collab.event_id)
        .where(EventCollaborator.user_id == current_user.id)
        .where(EventCollaborator.id != collab.id)
    )
    if dup_result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="You already have access to this event")

    collab.user_id = current_user.id
    collab.status = "accepted"
    collab.accepted_at = datetime.now(timezone.utc)
    await db.commit()

    return {"event_id": str(collab.event_id)}
