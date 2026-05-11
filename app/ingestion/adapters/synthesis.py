"""Synthesis adapters — produce the briefing artifact, not raw ingestion rows.

The mock generator is the only "live" entry in Phase 1; the Anthropic
synthesis is the Phase-2 replacement. Both expose `SourceAdapter` health so
the Sources page can render them alongside the ingestion sources.
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


class MockSynthesisAdapter(SourceAdapter):
    """The deterministic mock generator wired into `BriefingService`.

    Reports `MOCK` health with a perfect reliability score — it can't fail at
    the network layer because it's pure local Python.
    """

    metadata = SourceMetadata(
        name="Mock briefing generator",
        category=SourceCategory.SYNTHESIS,
        integration="Python · mock-v1",
        cadence="On-demand · scheduled at 06:30 UTC",
        fallback=None,
        priority=1,
        critical_path=True,
        description=(
            "Deterministic seeded generator. Active in Phase 1 until the "
            "Anthropic synthesis comes online."
        ),
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        return []  # synthesis adapters don't ingest

    async def health(self) -> SourceHealth:
        return SourceHealth(
            status=SourceStatus.MOCK,
            reliability_score=1.0,
        )


class AnthropicSynthesisAdapter(SourceAdapter):
    """Anthropic Claude synthesis — Phase 2 replacement for the mock generator.

    Five prompt-cached section calls per briefing, validated against the
    `BriefingCreate` schema. Falls back to `mock_briefing_generator` if the
    Anthropic API is unreachable, so the 07:00 UTC SLA never fails on a
    third-party outage.
    """

    metadata = SourceMetadata(
        name="Anthropic Claude",
        category=SourceCategory.SYNTHESIS,
        integration="Anthropic SDK · prompt-cached",
        cadence="On briefing assembly",
        fallback="mock_briefing_generator",
        priority=1,
        critical_path=True,
        description=(
            "Production AI synthesis — five section calls, prompt-cached on "
            "the BriefingContext, validated against the artifact schema."
        ),
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)
