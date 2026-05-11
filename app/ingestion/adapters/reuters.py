"""Reuters Eikon adapter — license-gated.

Phase 1 substitute: forwarded Reuters items arrive via the Outlook adapter
and are tagged `source = reuters` at ingestion time.

Phase 2: direct Eikon API integration via the `eikon` Python client. Requires
an Eikon license, an Application ID, and a running Eikon desktop session (or
the Refinitiv Workspace equivalent). Pulls headlines + body from the macro /
FX news ribbons on a 15-minute overnight cadence.
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


class ReutersAdapter(SourceAdapter):
    metadata = SourceMetadata(
        name="Reuters",
        category=SourceCategory.NEWS,
        integration="Eikon API",
        cadence="15m overnight · 60m daytime",
        fallback="outlook",
        priority=1,
        critical_path=False,
        description=(
            "Reuters Eikon news ribbons. License-gated; Phase 1 routes Reuters "
            "content via the Outlook adapter."
        ),
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        # Intentionally inert: Phase 1 has no Eikon credentials wired.
        # When credentials land, swap the stub for an `eikon.get_news_headlines`
        # call constrained by `dateFrom=since`.
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)
