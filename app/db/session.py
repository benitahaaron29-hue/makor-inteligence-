"""Async SQLAlchemy engine, session factory, and lifecycle helpers."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.logging import get_logger
from app.db.base import Base

logger = get_logger(__name__)


def _build_engine() -> AsyncEngine:
    """Construct an async engine with database-appropriate pooling."""
    kwargs: dict = {"echo": settings.DB_ECHO, "future": True}

    if settings.is_postgres:
        kwargs.update(
            pool_size=settings.DB_POOL_SIZE,
            max_overflow=settings.DB_MAX_OVERFLOW,
            pool_pre_ping=True,
        )

    return create_async_engine(settings.DATABASE_URL, **kwargs)


engine: AsyncEngine = _build_engine()

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
    class_=AsyncSession,
)


async def init_db() -> None:
    """Create all tables — used for local/dev boot before Alembic is run."""
    # Importing models here ensures they are registered against Base.metadata.
    from app.models import briefing  # noqa: F401
    from app.models import ingestion  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_lightweight_column_migration)
    logger.info("Database schema initialised (create_all + column patches).")


def _lightweight_column_migration(sync_conn) -> None:
    """Idempotently add columns that have been introduced after the table was
    first created. This is dev-convenience while the schema is still in flux;
    in production we'd run Alembic.

    Works for SQLite and Postgres via the SQLAlchemy inspector.
    """
    from sqlalchemy import inspect

    inspector = inspect(sync_conn)

    # briefings.intelligence (added after Phase 1 launch — rich editorial payload)
    if inspector.has_table("briefings"):
        existing = {col["name"] for col in inspector.get_columns("briefings")}
        if "intelligence" not in existing:
            sync_conn.exec_driver_sql(
                "ALTER TABLE briefings ADD COLUMN intelligence JSON"
            )
            logger.info("Added missing column: briefings.intelligence")


async def dispose_db() -> None:
    """Dispose of the engine connection pool."""
    await engine.dispose()
    logger.info("Database engine disposed.")


@asynccontextmanager
async def session_scope() -> AsyncIterator[AsyncSession]:
    """Context-managed session for use outside of FastAPI dependencies."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency yielding a fresh AsyncSession per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
