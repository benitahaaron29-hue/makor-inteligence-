"""Health and readiness endpoints."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, status
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.config import settings

router = APIRouter(tags=["health"])


@router.get("/health", status_code=status.HTTP_200_OK)
async def health() -> dict:
    """Liveness probe — service-level only."""
    return {
        "status": "ok",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness(session: DbSession) -> dict:
    """Readiness probe — verifies database connectivity."""
    db_ok = True
    db_error: str | None = None
    try:
        await session.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover
        db_ok = False
        db_error = str(exc)

    return {
        "status": "ok" if db_ok else "degraded",
        "checks": {
            "database": {
                "ok": db_ok,
                "error": db_error,
            }
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
