"""
App configuration.

DATABASE_URL defaults to a local SQLite file so the project runs with zero
setup. To use PostgreSQL instead (recommended for anything beyond local dev),
just set DATABASE_URL in a .env file, e.g.:

    DATABASE_URL=postgresql://user:password@localhost:5432/health_vault

No other code changes are needed - SQLAlchemy handles both the same way.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///./health_vault.db"
    jwt_secret: str = "dev-secret-change-this-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours
    storage_dir: str = os.path.join(os.path.dirname(__file__), "..", "storage", "uploads")
    max_upload_size_mb: int = 20

    class Config:
        env_file = ".env"


settings = Settings()

# Make sure the local upload directory exists
os.makedirs(settings.storage_dir, exist_ok=True)
