"""Outlook desk-inbox adapter — Microsoft Graph API.

The single most important Phase-1 source-of-record substitute. Until Bloomberg
and Reuters licenses are provisioned, broker desks forward their headline
streams into the Makor inbox. This adapter parses those forwards and produces
`desk_notes` rows (and, where parseable, `news_items` rows tagged with the
upstream source — Bloomberg, Reuters, etc.).

Phase 2: Microsoft Graph subscription webhook for push delivery plus a
5-minute sweep between 06:00–07:30 UTC for catch-up. Auth via the registered
app's client credentials.
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


class OutlookAdapter(SourceAdapter):
    metadata = SourceMetadata(
        name="Outlook desk inbox",
        category=SourceCategory.DESK,
        integration="Microsoft Graph API + webhook",
        cadence="Push + 5m sweep 06:00–07:30 UTC",
        fallback=None,
        priority=1,
        critical_path=True,
        description="Forwarded BBG/Reuters/broker color — the desk's proprietary tape.",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        # Phase 2:
        #   GET /me/mailFolders('desk')/messages
        #     ?$filter=receivedDateTime gt {since}
        #     &$top=200
        # Parse subject + body. Detect upstream (BBG / Reuters / broker)
        # via sender domain and forward-chain heuristics. Emit either a
        # `desk_notes` record or a `news_items` record tagged with the
        # original source.
        return []

    async def health(self) -> SourceHealth:
        return SourceHealth(status=SourceStatus.PHASE_2)


class AnalystNotesFolderAdapter(SourceAdapter):
    """Watches a shared `notes/` folder for markdown notes written by analysts.

    Each `.md` file becomes a `desk_notes` row with `source = notes_folder`.
    Phase 2: watchdog / inotify-based file observer.
    """

    metadata = SourceMetadata(
        name="Analyst notes folder",
        category=SourceCategory.DESK,
        integration="File watcher",
        cadence="On-change",
        fallback=None,
        priority=2,
        critical_path=False,
        description="Markdown notes share — strategist morning color.",
    )

    async def fetch(self, since: datetime) -> list[NormalizedRecord]:
        return []
