"""Pydantic schemas for Briefing creation, retrieval, and generation."""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import BriefingStatus, BriefingType, GenerationSource, RiskTone
from app.schemas.intelligence import Intelligence


class KeyEvent(BaseModel):
    """A scheduled macro / data event referenced in a briefing.

    Phase-2 ingestion enriches the basic time/region/event/forecast triple
    with desk-context fields (speaker, topic, sensitivity, pairs likely to
    react, expected vol impact, desk-focus tag). The mock generator populates
    these for known event types so the calendar reads like a real desk's.
    """

    time_utc: str = Field(..., description="HH:MM UTC timestamp.")
    region: str
    event: str
    importance: str = Field(default="medium", description="low | medium | high")
    forecast: str | None = None
    previous: str | None = None

    # ---- Desk enrichment (optional; populated by mock + Phase-2 calendar adapter) ----
    speaker: str | None = None
    topic: str | None = None
    category: str | None = None              # inflation / labour / growth / monetary / auction / policy / survey
    sensitivity: str | None = None           # desk_critical / high / medium / low
    pairs_affected: list[str] | None = None  # ["EUR/USD", "USD/JPY"]
    vol_impact: str | None = None            # "60–80 pip range in EUR/USD"
    desk_focus: str | None = None            # "High focus for USD/JPY and front-end rates"


class MarketSnapshot(BaseModel):
    """Lightweight market snapshot embedded in the briefing."""

    fx: dict[str, float] = Field(default_factory=dict)
    rates: dict[str, float] = Field(default_factory=dict)
    equities: dict[str, float] = Field(default_factory=dict)
    commodities: dict[str, float] = Field(default_factory=dict)
    as_of: datetime | None = None


# --- Inbound --------------------------------------------------------------


class BriefingGenerateRequest(BaseModel):
    """Request to generate a new briefing (mock pipeline in Phase 1)."""

    briefing_date: date | None = Field(
        default=None,
        description="Trading date for the briefing. Defaults to today (desk TZ).",
    )
    briefing_type: BriefingType = BriefingType.MORNING_FX_MACRO
    publish: bool = Field(
        default=True,
        description="If true, the generated briefing is stored as PUBLISHED.",
    )
    overwrite: bool = Field(
        default=False,
        description="If true, an existing briefing for the same date+type is replaced.",
    )


class BriefingCreate(BaseModel):
    """Internal payload for persisting a briefing."""

    briefing_date: date
    briefing_type: BriefingType
    status: BriefingStatus
    title: str
    headline: str
    executive_summary: str
    fx_commentary: str
    rates_commentary: str
    equities_commentary: str
    commodities_commentary: str
    risk_tone: RiskTone
    key_events: list[KeyEvent]
    risk_themes: list[str]
    market_snapshot: MarketSnapshot
    intelligence: Intelligence | None = None
    generation_source: GenerationSource
    generator_version: str
    model_name: str | None
    generation_metadata: dict[str, Any]
    desk: str
    author: str
    published_at: datetime | None


# --- Outbound -------------------------------------------------------------


class BriefingSummary(BaseModel):
    """Compact briefing record for listings / archives."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    briefing_date: date
    briefing_type: BriefingType
    status: BriefingStatus
    title: str
    headline: str
    risk_tone: RiskTone
    published_at: datetime | None
    created_at: datetime


class BriefingRead(BaseModel):
    """Full briefing payload."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    briefing_date: date
    briefing_type: BriefingType
    status: BriefingStatus

    title: str
    headline: str
    executive_summary: str

    fx_commentary: str
    rates_commentary: str
    equities_commentary: str
    commodities_commentary: str

    risk_tone: RiskTone
    key_events: list[dict[str, Any]]
    risk_themes: list[str]
    market_snapshot: dict[str, Any]
    intelligence: Intelligence | None = None

    generation_source: GenerationSource
    generator_version: str
    model_name: str | None
    generation_metadata: dict[str, Any]

    desk: str
    author: str

    published_at: datetime | None
    created_at: datetime
    updated_at: datetime
