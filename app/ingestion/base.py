"""Base types for the ingestion adapter framework."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import StrEnum
from typing import Any


class SourceCategory(StrEnum):
    """Top-level taxonomy of ingestion sources."""

    NEWS = "news"
    CALENDAR = "calendar"
    MARKET = "market"
    DESK = "desk"
    VOLATILITY = "volatility"
    SYNTHESIS = "synthesis"


class SourceStatus(StrEnum):
    """Health state of a single source.

    The Sources page renders these directly. The scheduler chooses fallbacks
    based on `LIVE` vs `DEGRADED`/`FALLBACK`.
    """

    LIVE = "live"          # adapter running, recent successful pull, fresh data
    DEGRADED = "degraded"  # adapter running but stale or partial
    FALLBACK = "fallback"  # primary unavailable; secondary is serving
    MOCK = "mock"          # deterministic mock — Phase 1 default for synthesis
    PHASE_2 = "phase_2"    # adapter not yet implemented


@dataclass(frozen=True)
class SourceMetadata:
    """Static description of a source — what it is and how it runs.

    Read by the Sources page and by the scheduler. Does not change at runtime.
    """

    name: str
    category: SourceCategory
    integration: str               # e.g. "RSS", "REST API", "BLPAPI", "Graph API"
    cadence: str                   # human-readable, e.g. "5m overnight · 15m daytime"
    fallback: str | None = None    # name of the fallback adapter, if any
    priority: int = 1              # 1 = primary, 2 = secondary cross-check
    critical_path: bool = False    # gates the 07:00 UTC SLA?
    description: str = ""


@dataclass
class SourceHealth:
    """Runtime health snapshot for one source."""

    status: SourceStatus
    last_success_at: datetime | None = None
    last_error: str | None = None
    reliability_score: float | None = None   # 0.0–1.0, rolling 30d success rate
    records_last_run: int = 0
    # Phase-2 operational metadata an ops engineer cares about
    latency_ms: int | None = None            # typical p50 fetch latency
    vendor: str | None = None                # "Refinitiv", "Microsoft Graph", "AWS"
    region: str | None = None                # GLOBAL / US / EU / APAC / DESK


@dataclass
class NormalizedRecord:
    """A single normalized record produced by an adapter.

    Adapters never write directly to the DB — they emit these records and the
    ingestion worker hands them to the appropriate repository.
    """

    source: str
    source_id: str
    category: SourceCategory
    payload: dict[str, Any] = field(default_factory=dict)
    occurred_at: datetime | None = None


class SourceAdapter(ABC):
    """Abstract base for all ingestion adapters.

    Adapters are pure: `fetch(since)` returns a list of records and has no
    side effects. Health probes are independent of the fetch cycle and may be
    called on the Sources page request path.
    """

    metadata: SourceMetadata

    @abstractmethod
    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        """Return records produced since `since`. Empty list = no new data."""
        ...

    async def health(self) -> SourceHealth:
        """Default health: PHASE_2. Concrete adapters override."""
        return SourceHealth(status=SourceStatus.PHASE_2)
