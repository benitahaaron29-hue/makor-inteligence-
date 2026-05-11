"""Briefing ORM model — the canonical institutional briefing artifact."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Date, DateTime, Index, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.core.enums import BriefingStatus, BriefingType, GenerationSource, RiskTone
from app.db.base import Base, TimestampMixin


class Briefing(Base, TimestampMixin):
    """A single Morning FX & Macro briefing artifact."""

    __tablename__ = "briefings"
    __table_args__ = (
        UniqueConstraint(
            "briefing_date",
            "briefing_type",
            name="briefings_date_type_unique",
        ),
        Index("ix_briefings_published_at", "published_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    briefing_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    briefing_type: Mapped[BriefingType] = mapped_column(
        String(64),
        nullable=False,
        default=BriefingType.MORNING_FX_MACRO,
    )
    status: Mapped[BriefingStatus] = mapped_column(
        String(32),
        nullable=False,
        default=BriefingStatus.DRAFT,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    headline: Mapped[str] = mapped_column(String(512), nullable=False)
    executive_summary: Mapped[str] = mapped_column(String, nullable=False)

    fx_commentary: Mapped[str] = mapped_column(String, nullable=False)
    rates_commentary: Mapped[str] = mapped_column(String, nullable=False)
    equities_commentary: Mapped[str] = mapped_column(String, nullable=False)
    commodities_commentary: Mapped[str] = mapped_column(String, nullable=False)

    risk_tone: Mapped[RiskTone] = mapped_column(
        String(32),
        nullable=False,
        default=RiskTone.NEUTRAL,
    )

    key_events: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    risk_themes: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
    )
    market_snapshot: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    # Rich editorial payload — StrategistView, KeyTakeaways, TradeIdeas with
    # levels/stops/catalysts, CentralBankItems, PairCommentary, Positioning,
    # SessionBreakdown, CrossAsset, PullStats, RiskWarnings, ConsensusCalls,
    # Provenance. See app.schemas.intelligence.Intelligence.
    # Nullable so briefings written before this column existed still load.
    intelligence: Mapped[dict[str, Any] | None] = mapped_column(
        JSON,
        nullable=True,
        default=None,
    )

    generation_source: Mapped[GenerationSource] = mapped_column(
        String(32),
        nullable=False,
        default=GenerationSource.MOCK,
    )
    generator_version: Mapped[str] = mapped_column(String(64), nullable=False)
    model_name: Mapped[str | None] = mapped_column(String(128), nullable=True)
    generation_metadata: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    desk: Mapped[str] = mapped_column(String(128), nullable=False)
    author: Mapped[str] = mapped_column(String(128), nullable=False)

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return (
            f"<Briefing id={self.id} date={self.briefing_date} "
            f"type={self.briefing_type} status={self.status}>"
        )
