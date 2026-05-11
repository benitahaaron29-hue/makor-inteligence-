"""Bloomberg adapter — license-gated.

Phase 1 substitute: forwarded Bloomberg items arrive via the Outlook adapter
and are tagged `source = bloomberg`.

Phase 2: direct BLPAPI integration. Connects either to a local Bloomberg
Terminal session (DAPI on `localhost:8194`) or to a dedicated B-PIPE server.
For market data, subscribes to FX / rates / equity tickers. For news,
consumes the Bloomberg News API headline feed.
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


class BloombergNewsAdapter(SourceAdapter):
    metadata = SourceMetadata(
        name="Bloomberg news",
        category=SourceCategory.NEWS,
        integration="BLPAPI · News API",
        cadence="15m overnight · 60m daytime",
        fallback="outlook",
        priority=1,
        critical_path=False,
        description=(
            "Bloomberg News API headlines. License-gated; Phase 1 routes "
            "Bloomberg content via the Outlook adapter."
        ),
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)


class BloombergMarketAdapter(SourceAdapter):
    """Bloomberg market-data adapter — BLPAPI ReferenceDataRequest."""

    metadata = SourceMetadata(
        name="Bloomberg market data",
        category=SourceCategory.MARKET,
        integration="BLPAPI",
        cadence="5m during 06:00–07:00 UTC",
        fallback="yahoo_finance",
        priority=1,
        critical_path=False,
        description=(
            "Bloomberg market quotes — gold standard for the briefing snapshot "
            "when a Terminal/B-PIPE session is reachable."
        ),
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)
