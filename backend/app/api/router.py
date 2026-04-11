from fastapi import APIRouter

from app.api.v1 import auth, attendees, events, photos

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(events.router)
api_router.include_router(photos.router)
api_router.include_router(attendees.router)
