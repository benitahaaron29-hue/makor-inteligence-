"""Morning workflow orchestrator — runs the daily briefing pipeline.

Designed to be invoked either on-demand (via the API) or by a scheduler at
06:00 UTC. The seven steps are:

  1. pull_all_sources         — invoke every ingestion adapter
  2. ingest_outlook           — sweep the desk inbox for overnight forwards
  3. ingest_vol_sheet         — parse the internal volatility XLSX
  4. build_intelligence_pool  — assemble the BriefingContext payload
  5. generate_briefing        — AI synthesis (mock-v1 in Phase 1)
  6. validate_and_publish     — schema-check + persist
  7. archive_and_notify       — make visible in /archive, post to desk channel

Phase 1 is honest about its limits: steps 1–4 and 7 are scaffolds that log
their intent and yield no-ops. Step 5 calls the existing mock generator so
the workflow produces a real briefing end-to-end today.
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.enums import BriefingType
from app.core.logging import get_logger
from app.ingestion.base import NormalizedRecord, SourceCategory
from app.ingestion.registry import ADAPTERS, by_category
from app.models.briefing import Briefing
from app.schemas.briefing import BriefingGenerateRequest
from app.services.briefing_service import BriefingService

logger = get_logger(__name__)


# ============================================================ TYPES


@dataclass
class StepResult:
    name: str
    started_at: datetime
    finished_at: datetime
    status: str
    detail: str = ""
    records: int = 0


@dataclass
class WorkflowResult:
    target_date: date
    briefing: Briefing | None
    steps: list[StepResult] = field(default_factory=list)
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    finished_at: datetime | None = None

    @property
    def duration_ms(self) -> int:
        if self.finished_at is None:
            return 0
        return int((self.finished_at - self.started_at).total_seconds() * 1000)


@dataclass
class BriefingContext:
    """The payload handed from ingestion to synthesis.

    In Phase 2 this is densely populated. In Phase 1 it stays empty — the mock
    generator doesn't need it.
    """

    target_date: date
    news_items: list[NormalizedRecord] = field(default_factory=list)
    calendar_events: list[NormalizedRecord] = field(default_factory=list)
    market_quotes: list[NormalizedRecord] = field(default_factory=list)
    desk_notes: list[NormalizedRecord] = field(default_factory=list)
    vol_metrics: list[NormalizedRecord] = field(default_factory=list)
    regime_signals: dict[str, Any] = field(default_factory=dict)


# ============================================================ ORCHESTRATOR


class MorningWorkflow:
    """Coordinates the 06:00 UTC briefing-generation pipeline."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.briefing_service = BriefingService(session)

    # ------------------------------------------------------------------ public

    async def run(self, target_date: date | None = None) -> WorkflowResult:
        target = target_date or self._today_in_desk_tz()
        result = WorkflowResult(target_date=target, briefing=None)

        # 1. pull all sources
        await self._record_step(result, "pull_all_sources", self._pull_all_sources, target)
        # 2. ingest Outlook
        await self._record_step(result, "ingest_outlook", self._ingest_outlook, target)
        # 3. ingest vol sheet
        await self._record_step(result, "ingest_vol_sheet", self._ingest_vol_sheet, target)
        # 4. build intelligence pool
        context_step = await self._record_step(
            result, "build_intelligence_pool", self._build_intelligence_pool, target,
        )
        context: BriefingContext = context_step  # type: ignore[assignment]

        # 5. generate briefing (the only Phase-1-active step)
        briefing = await self._generate_briefing(target, context)
        result.briefing = briefing

        # 6. publish (handled inside generate_briefing via publish=True)
        await self._record_step(result, "validate_and_publish", self._validate_and_publish, briefing)

        # 7. notify desk (Phase 3)
        await self._record_step(result, "archive_and_notify", self._archive_and_notify, briefing)

        result.finished_at = datetime.now(timezone.utc)
        logger.info(
            "Morning workflow complete: date=%s briefing=%s duration=%dms steps=%d",
            target,
            briefing.id if briefing else None,
            result.duration_ms,
            len(result.steps),
        )
        return result

    # ------------------------------------------------------------------ steps

    async def _pull_all_sources(self, target_date: date) -> StepResult:
        """Invoke every registered adapter's `fetch()` for the run window."""
        pulled = 0
        for adapter in ADAPTERS:
            if adapter.metadata.category == SourceCategory.SYNTHESIS:
                continue  # synthesis is not pull-side
            try:
                records = await adapter.fetch(since=self._since_for(target_date))
                pulled += len(records)
                # Phase 2: hand `records` to the repository layer to persist.
                logger.debug(
                    "Adapter %s yielded %d records (Phase 1: no-op)",
                    adapter.metadata.name,
                    len(records),
                )
            except NotImplementedError:
                continue
            except Exception as exc:
                logger.warning(
                    "Adapter %s raised during pull: %s", adapter.metadata.name, exc,
                )
                continue
        return self._ok("pull_all_sources", detail=f"{len(ADAPTERS)} adapters polled", records=pulled)

    async def _ingest_outlook(self, target_date: date) -> StepResult:
        # Phase 2: trigger an Outlook catch-up sweep beyond the routine cadence.
        return self._ok("ingest_outlook", detail="Phase 2 — Graph API webhook + sweep")

    async def _ingest_vol_sheet(self, target_date: date) -> StepResult:
        # Phase 2: re-parse the strategist's internal XLSX vol sheet.
        return self._ok("ingest_vol_sheet", detail="Phase 2 — XLSX file watcher")

    async def _build_intelligence_pool(self, target_date: date) -> BriefingContext:
        # Phase 2: query ingestion tables for the trailing 12–24h and
        # compute regime signals. Phase 1: return an empty context.
        return BriefingContext(target_date=target_date)

    async def _generate_briefing(
        self,
        target_date: date,
        context: BriefingContext,
    ) -> Briefing:
        """Phase 1: hand off to the existing mock generator via BriefingService.

        Phase 2: the AnthropicSynthesisAdapter consumes `context` and emits a
        `BriefingCreate` for `BriefingRepository.create()`.
        """
        request = BriefingGenerateRequest(
            briefing_date=target_date,
            briefing_type=BriefingType.MORNING_FX_MACRO,
            publish=True,
            overwrite=True,
        )
        briefing = await self.briefing_service.generate_and_save(request)
        return briefing

    async def _validate_and_publish(self, briefing: Briefing) -> StepResult:
        # BriefingService.generate_and_save already validates against the
        # Pydantic schema; this step exists as a future hook for additional
        # cross-source validation (price sanity, calendar consistency, etc.).
        return self._ok(
            "validate_and_publish",
            detail=f"briefing {briefing.id} status={briefing.status}",
        )

    async def _archive_and_notify(self, briefing: Briefing) -> StepResult:
        # The `briefings` table is the archive; this step is the desk-notify
        # hook (Slack / email digest) — Phase 3.
        return self._ok(
            "archive_and_notify",
            detail="Phase 3 — desk notify channel",
        )

    # ------------------------------------------------------------------ helpers

    @staticmethod
    def _today_in_desk_tz() -> date:
        return datetime.now(ZoneInfo(settings.BRIEFING_TIMEZONE)).date()

    @staticmethod
    def _since_for(target_date: date) -> datetime:
        """Pull-window start: 06:00 UTC the previous day. Covers the overnight tape."""
        anchor = datetime.combine(target_date, datetime.min.time(), tzinfo=timezone.utc)
        return anchor.replace(hour=6) - timedelta(days=1)

    @staticmethod
    def _ok(name: str, detail: str = "", records: int = 0) -> StepResult:
        now = datetime.now(timezone.utc)
        return StepResult(
            name=name, started_at=now, finished_at=now,
            status="success", detail=detail, records=records,
        )

    async def _record_step(self, result: WorkflowResult, name: str, fn, *args):
        started = datetime.now(timezone.utc)
        t0 = time.monotonic()
        try:
            outcome = await fn(*args)
            elapsed = int((time.monotonic() - t0) * 1000)
            if isinstance(outcome, StepResult):
                # outcome already framed
                step = outcome
            else:
                step = StepResult(
                    name=name, started_at=started, finished_at=datetime.now(timezone.utc),
                    status="success", detail=f"{elapsed}ms",
                )
            result.steps.append(step)
            return outcome
        except Exception as exc:
            logger.exception("Workflow step %s failed", name)
            result.steps.append(StepResult(
                name=name, started_at=started, finished_at=datetime.now(timezone.utc),
                status="failed", detail=str(exc),
            ))
            raise
