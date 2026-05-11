"""Internal volatility Excel sheet adapter.

The strategist maintains the canonical vol surface in an XLSX on the shared
drive. This adapter watches the file for changes and parses ATM / 25Δ RR /
25Δ BF per pair-tenor into `vol_metrics` rows.

Phase 2: watchdog-based file observer + openpyxl parse. The sheet schema is
defined by the strategist; we lock the expected cell range and emit a single
ingestion run per save.
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


class ExcelVolSheetAdapter(SourceAdapter):
    metadata = SourceMetadata(
        name="Internal vol sheet",
        category=SourceCategory.VOLATILITY,
        integration="XLSX file watcher",
        cadence="On-change",
        fallback="cme_settlement",
        priority=1,
        critical_path=True,
        description="Strategist-maintained FX vol surface — desk's canonical book.",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        # Phase 2: openpyxl.load_workbook(path, data_only=True), walk the
        # ATM / RR / BF blocks, emit one record per (instrument, tenor).
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)


class CMESettlementAdapter(SourceAdapter):
    """CME daily settlement — curves + product vol."""

    metadata = SourceMetadata(
        name="CME settlement",
        category=SourceCategory.VOLATILITY,
        integration="CSV download",
        cadence="Daily 22:30 UTC",
        fallback=None,
        priority=2,
        critical_path=False,
        description="Listed product settlement — curves and listed-vol.",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        return []


class CVOLAdapter(SourceAdapter):
    """CME CVOL FX implied-vol benchmark."""

    metadata = SourceMetadata(
        name="CVOL",
        category=SourceCategory.VOLATILITY,
        integration="CME CVOL data",
        cadence="Daily 22:30 UTC",
        fallback=None,
        priority=2,
        critical_path=False,
        description="CME CVOL — implied vol benchmark for FX majors.",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        return []
