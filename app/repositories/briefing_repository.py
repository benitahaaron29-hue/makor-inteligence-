"""Repository layer for Briefing persistence — pure data access, no business logic."""

from __future__ import annotations

import uuid
from datetime import date

from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import BriefingStatus, BriefingType
from app.models.briefing import Briefing
from app.schemas.briefing import BriefingCreate


class BriefingRepository:
    """Async data-access object for Briefing aggregates."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- Writes ---------------------------------------------------------

    async def create(self, payload: BriefingCreate) -> Briefing:
        briefing = Briefing(
            briefing_date=payload.briefing_date,
            briefing_type=payload.briefing_type,
            status=payload.status,
            title=payload.title,
            headline=payload.headline,
            executive_summary=payload.executive_summary,
            fx_commentary=payload.fx_commentary,
            rates_commentary=payload.rates_commentary,
            equities_commentary=payload.equities_commentary,
            commodities_commentary=payload.commodities_commentary,
            risk_tone=payload.risk_tone,
            key_events=[ev.model_dump() for ev in payload.key_events],
            risk_themes=list(payload.risk_themes),
            market_snapshot=payload.market_snapshot.model_dump(mode="json"),
            intelligence=(
                payload.intelligence.model_dump(mode="json")
                if payload.intelligence is not None
                else None
            ),
            generation_source=payload.generation_source,
            generator_version=payload.generator_version,
            model_name=payload.model_name,
            generation_metadata=dict(payload.generation_metadata),
            desk=payload.desk,
            author=payload.author,
            published_at=payload.published_at,
        )
        self.session.add(briefing)
        await self.session.flush()
        await self.session.refresh(briefing)
        return briefing

    async def delete_for_date(
        self,
        briefing_date: date,
        briefing_type: BriefingType,
    ) -> int:
        result = await self.session.execute(
            delete(Briefing).where(
                Briefing.briefing_date == briefing_date,
                Briefing.briefing_type == briefing_type,
            )
        )
        return result.rowcount or 0

    # --- Reads ----------------------------------------------------------

    async def get_by_id(self, briefing_id: uuid.UUID) -> Briefing | None:
        return await self.session.get(Briefing, briefing_id)

    async def get_for_date(
        self,
        briefing_date: date,
        briefing_type: BriefingType = BriefingType.MORNING_FX_MACRO,
    ) -> Briefing | None:
        stmt = (
            select(Briefing)
            .where(
                Briefing.briefing_date == briefing_date,
                Briefing.briefing_type == briefing_type,
            )
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_latest(
        self,
        briefing_type: BriefingType = BriefingType.MORNING_FX_MACRO,
        status: BriefingStatus | None = BriefingStatus.PUBLISHED,
    ) -> Briefing | None:
        stmt = select(Briefing).where(Briefing.briefing_type == briefing_type)
        if status is not None:
            stmt = stmt.where(Briefing.status == status)
        stmt = stmt.order_by(desc(Briefing.briefing_date), desc(Briefing.created_at)).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_recent(
        self,
        limit: int = 30,
        briefing_type: BriefingType | None = None,
    ) -> list[Briefing]:
        stmt = select(Briefing)
        if briefing_type is not None:
            stmt = stmt.where(Briefing.briefing_type == briefing_type)
        stmt = stmt.order_by(desc(Briefing.briefing_date), desc(Briefing.created_at)).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
