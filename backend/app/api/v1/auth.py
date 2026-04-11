from fastapi import APIRouter

from app.api.deps import CurrentUser, DB
from app.schemas.photo import UserSchema

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserSchema)
async def get_me(current_user: CurrentUser):
    """Return the authenticated admin's profile. Creates the user row on first call."""
    return current_user
