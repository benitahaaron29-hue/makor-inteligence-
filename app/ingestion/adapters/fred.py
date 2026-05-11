"""FRED REST adapter — macro time series (St Louis Fed).

Phase 2: daily 22:00 UTC pull of a curated series watchlist — UST yields,
breakevens, financial conditions indices, CPI / NFP / claims history. Used
for regime signal computation, not for the briefing's daily snapshot.
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


class FredAdapter(SourceAdapter):
    metadata = SourceMetadata(
        name="FRED",
        category=SourceCategory.MARKET,
        integration="REST API",
        cadence="Daily 22:00 UTC",
        fallback=None,
        priority=1,
        critical_path=False,
        description="Macro time series — UST yields, breakevens, FCIs, releases history.",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        # Phase 2: fredapi.Fred.get_series(series_id, observation_start=since).
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)
