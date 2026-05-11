"""Application configuration — environment-driven, twelve-factor."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings sourced from environment variables and .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application -----------------------------------------------------
    APP_NAME: str = "Makor Intelligence Platform"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    # --- Server ----------------------------------------------------------
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # --- Database --------------------------------------------------------
    # Defaults to a local SQLite database for instant local boot.
    # In Docker / production set DATABASE_URL to a postgres+asyncpg DSN.
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./makor_dev.db",
        description="Async SQLAlchemy database URL.",
    )
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # --- Anthropic (wired in a later phase) ------------------------------
    ANTHROPIC_API_KEY: str | None = None
    ANTHROPIC_MODEL: str = "claude-opus-4-7"

    # --- Briefing generation --------------------------------------------
    BRIEFING_TIMEZONE: str = "Europe/London"
    BRIEFING_DESK: str = "Makor Macro & FX Desk"
    BRIEFING_GENERATOR_VERSION: str = "mock-v1"

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def is_postgres(self) -> bool:
        return self.DATABASE_URL.startswith("postgresql")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the cached settings instance."""
    return Settings()


settings = get_settings()
