from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_name: str = "SnapDrop"
    debug: bool = False
    environment: str = "development"

    # Database
    database_url: str  # asyncpg DSN, e.g. postgresql+asyncpg://user:pass@host/db

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_jwt_secret: str = ""  # only needed for legacy HS256 tokens

    # Cloudflare R2
    r2_account_id: str
    r2_access_key_id: str
    r2_secret_access_key: str
    r2_bucket_name: str
    r2_public_url: str  # public bucket base URL for QR codes (if bucket is public)

    # Email (Mandrill)
    mandrill_api_key: str = ""
    email_from: str = "noreply@snapdrop.app"

    # Frontend
    frontend_url: str = "http://localhost:5173"

    # Feature flags
    max_photo_size_bytes: int = 10 * 1024 * 1024  # 10 MB
    max_event_duration_days: int = 14
    photo_retention_days: int = 30
    deletion_warning_days: int = 7  # warn at 30 - 7 = day 23

    # Tier caps
    plan_caps: dict[str, int | None] = {
        "free": 5,
        "starter": 50,
        "pro": 100,
        "business": 150,
        "unlimited": None,
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
