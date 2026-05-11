"""FastAPI dependency providers."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db_session
from app.services.briefing_service import BriefingService

DbSession = Annotated[AsyncSession, Depends(get_db_session)]


async def get_briefing_service(session: DbSession) -> BriefingService:
    return BriefingService(session)


BriefingSvc = Annotated[BriefingService, Depends(get_briefing_service)]
