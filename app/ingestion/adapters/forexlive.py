"""ForexLive RSS adapter — overnight FX/macro narrative.

ForexLive is the highest-signal free RSS for FX desk narrative. Phase 2 pulls
https://www.forexlive.com/feed/ on a 5-minute cadence overnight (21:00–07:00
UTC) and a 15-minute cadence during the day. Each item becomes one row in
`news_items`.
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


class ForexLiveAdapter(SourceAdapter):
    metadata = SourceMetadata(
        name="ForexLive",
        category=SourceCategory.NEWS,
        integration="RSS",
        cadence="5m overnight · 15m daytime",
        fallback=None,
        priority=1,
        critical_path=True,
        description="Primary FX desk narrative feed — overnight tape & headline cluster.",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        # Phase 2: httpx.get RSS, parse with feedparser, emit one
        # NormalizedRecord per <item>. Use entry.id for source_id (stable).
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)
