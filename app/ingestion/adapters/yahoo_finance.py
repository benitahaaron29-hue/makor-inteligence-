"""Yahoo Finance (via `yfinance`) — FX / rates / equities / commodities snapshot.

Phase 2: 06:00 UTC daily snapshot. Pulls one quote per instrument on a fixed
watchlist; writes `market_quotes` rows. Free, reliable, sufficient for the
briefing. Cross-checked by AlphaVantage on FX pairs.
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


class YahooFinanceAdapter(SourceAdapter):
    metadata = SourceMetadata(
        name="Yahoo Finance",
        category=SourceCategory.MARKET,
        integration="yfinance",
        cadence="06:00 UTC snapshot",
        fallback="alpha_vantage",
        priority=1,
        critical_path=True,
        description="Primary FX/rates/equities/commodities snapshot.",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        # Phase 2: yfinance.Tickers([...]).history(period="1d"), emit one
        # record per instrument with instrument_class derived from symbol.
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)


class AlphaVantageAdapter(SourceAdapter):
    """Secondary FX/macro cross-check via AlphaVantage REST."""

    metadata = SourceMetadata(
        name="AlphaVantage",
        category=SourceCategory.MARKET,
        integration="REST API",
        cadence="06:00 UTC backup snapshot",
        fallback=None,
        priority=2,
        critical_path=False,
        description="Secondary FX cross-check.",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        return []
