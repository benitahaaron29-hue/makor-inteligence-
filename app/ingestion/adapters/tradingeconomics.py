"""TradingEconomics REST adapter — authoritative economic calendar.

Phase 2: snapshot at 03:00 UTC of all events for `today + 1` day, then
30-minute revisions to capture consensus updates and actuals. One row per
event in `calendar_events`.

Falls back to the Investing.com / ForexFactory cross-checks if TE is
unreachable.
"""

from __future__ import annotations

from datetime import datetime

from app.ingestion.base import (
    NormalizedRecord,
    SourceAdapter,
    SourceCategory,
    SourceHealth,
    SourceMetadata,
    SourceStatus,
)


class TradingEconomicsAdapter(SourceAdapter):
    metadata = SourceMetadata(
        name="TradingEconomics",
        category=SourceCategory.CALENDAR,
        integration="REST API",
        cadence="03:00 UTC snapshot · 30m revisions",
        fallback="investing_dot_com",
        priority=1,
        critical_path=True,
        description="Authoritative consensus + actuals for the economic calendar.",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        # Phase 2: GET /calendar?d1=today&d2=today+1 with API key.
        # Emit one record per event; source_id = TE event id.
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)


class InvestingDotComAdapter(SourceAdapter):
    """Secondary calendar cross-check via investing.com HTML scrape.

    Phase 2 only — used to validate TE's consensus and catch revisions TE
    misses. Never on the critical path.
    """

    metadata = SourceMetadata(
        name="Investing.com",
        category=SourceCategory.CALENDAR,
        integration="HTML scrape",
        cadence="Daily 04:00 UTC",
        fallback="forexfactory",
        priority=2,
        critical_path=False,
        description="Secondary calendar cross-check (HTML).",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        return []


class ForexFactoryAdapter(SourceAdapter):
    """Tertiary calendar cross-check via forexfactory.com HTML scrape."""

    metadata = SourceMetadata(
        name="ForexFactory",
        category=SourceCategory.CALENDAR,
        integration="HTML scrape",
        cadence="Daily 04:00 UTC",
        fallback=None,
        priority=2,
        critical_path=False,
        description="Tertiary calendar cross-check (HTML).",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        return []
