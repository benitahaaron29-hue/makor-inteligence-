"""Orchestration service — wires the generator with the repository."""

from __future__ import annotations

from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.enums import BriefingStatus, BriefingType
from app.core.logging import get_logger
from app.models.briefing import Briefing
from app.repositories.briefing_repository import BriefingRepository
from app.schemas.briefing import BriefingGenerateRequest
from app.services.briefing_generator import (
    MockBriefingGenerator,
    get_briefing_generator,
)

logger = get_logger(__name__)


class BriefingConflictError(Exception):
    """Raised when a briefing already exists for the requested date+type."""


class BriefingService:
    """Application service coordinating generation + persistence."""

    def __init__(
        self,
        session: AsyncSession,
        generator: MockBriefingGenerator | None = None,
    ) -> None:
        self.session = session
        self.repository = BriefingRepository(session)
        self.generator = generator or get_briefing_generator()

    @staticmethod
    def _today_in_desk_tz() -> date:
        return datetime.now(ZoneInfo(settings.BRIEFING_TIMEZONE)).date()

    async def generate_and_save(self, request: BriefingGenerateRequest) -> Briefing:
        """Generate a briefing for the requested date and persist it."""
        target_date = request.briefing_date or self._today_in_desk_tz()

        existing = await self.repository.get_for_date(target_date, request.briefing_type)
        if existing is not None and not request.overwrite:
            raise BriefingConflictError(
                f"A {request.briefing_type.value} briefing already exists "
                f"for {target_date.isoformat()}."
            )

        if existing is not None and request.overwrite:
            await self.repository.delete_for_date(target_date, request.briefing_type)
            logger.info(
                "Overwriting existing briefing date=%s type=%s",
                target_date,
                request.briefing_type.value,
            )

        payload = self.generator.generate(
            briefing_date=target_date,
            briefing_type=request.briefing_type,
            publish=request.publish,
        )
        briefing = await self.repository.create(payload)
        await self.session.commit()
        await self.session.refresh(briefing)

        logger.info(
            "Briefing generated id=%s date=%s status=%s",
            briefing.id,
            briefing.briefing_date,
            briefing.status,
        )
        return briefing

    async def get_latest_published(
        self,
        briefing_type: BriefingType = BriefingType.MORNING_FX_MACRO,
    ) -> Briefing | None:
        return await self.repository.get_latest(
            briefing_type=briefing_type,
            status=BriefingStatus.PUBLISHED,
        )

    async def get_for_date(
        self,
        briefing_date: date,
        briefing_type: BriefingType = BriefingType.MORNING_FX_MACRO,
    ) -> Briefing | None:
        return await self.repository.get_for_date(briefing_date, briefing_type)

    async def list_recent(self, limit: int = 30) -> list[Briefing]:
        return await self.repository.list_recent(limit=limit)
