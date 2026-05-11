"""Sources API — feeds the institutional Sources page.

`GET /sources` returns the adapter registry projected into a JSON-friendly
shape: metadata + current health for each source. The Phase-1 mock-health
layer (`app.ingestion.mock_health`) decorates the response with realistic
operational metadata (latency, vendor, region, last-success age, reliability
score) so the Sources page reads like a real desk console.

In Phase 2 each adapter's own `health()` method queries `ingestion_runs`
for true data; the mock layer falls out automatically when the registry
returns non-PHASE_2 statuses.
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict

from app.ingestion.base import SourceCategory, SourceStatus
from app.ingestion.mock_health import mock_health
from app.ingestion.registry import ADAPTERS

router = APIRouter(prefix="/sources", tags=["sources"])


class SourceView(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    name: str
    category: SourceCategory
    integration: str
    cadence: str
    fallback: str | None
    priority: int
    critical_path: bool
    description: str

    status: SourceStatus
    last_success_at: datetime | None
    last_error: str | None
    reliability_score: float | None
    records_last_run: int

    # Operational realism fields
    latency_ms: int | None = None
    vendor: str | None = None
    region: str | None = None


@router.get("", response_model=list[SourceView])
async def list_sources() -> list[SourceView]:
    """Return every adapter in registry order with its current health."""
    out: list[SourceView] = []
    for adapter in ADAPTERS:
        m = adapter.metadata
        # The adapter's own health() returns the canonical status (PHASE_2 /
        # MOCK). We then decorate it with realistic operational fields for
        # Phase 1 so the Sources page reads like a real desk console.
        base = await adapter.health()
        enriched = mock_health(m.name, default_status=base.status)
        out.append(
            SourceView(
                name=m.name,
                category=m.category,
                integration=m.integration,
                cadence=m.cadence,
                fallback=m.fallback,
                priority=m.priority,
                critical_path=m.critical_path,
                description=m.description,
                status=enriched.status,
                last_success_at=enriched.last_success_at,
                last_error=enriched.last_error,
                reliability_score=enriched.reliability_score,
                records_last_run=enriched.records_last_run,
                latency_ms=enriched.latency_ms,
                vendor=enriched.vendor,
                region=enriched.region,
            )
        )
    return out
