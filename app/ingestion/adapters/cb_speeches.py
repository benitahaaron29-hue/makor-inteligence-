"""Central-bank speech feeds.

Aggregates the official communications channels of the major central banks:
Fed (FOMC speeches, FOMC statements, press conferences), ECB, BoE, BoJ, SNB,
RBA, RBNZ, BoC. Phase 2: per-CB scraper that posts to a unified feed; each
speech becomes one `news_items` row with `category = news` and a `central_bank`
tag for downstream filtering.
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


class CentralBankSpeechesAdapter(SourceAdapter):
    metadata = SourceMetadata(
        name="Central-bank speeches",
        category=SourceCategory.NEWS,
        integration="Per-CB HTML scrape",
        cadence="30m during 12:00–22:00 UTC",
        fallback=None,
        priority=1,
        critical_path=False,
        description=(
            "Aggregated FOMC / ECB / BoE / BoJ / SNB / RBA / RBNZ / BoC official "
            "communications — feeds the Central Bank Watch section."
        ),
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        # Phase 2: per-CB scraper plugins under cb_speeches/{fed,ecb,boe,…}.py;
        # this adapter dispatches to each and merges results.
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)
