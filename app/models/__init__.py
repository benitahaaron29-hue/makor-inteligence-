"""ORM models — re-exported for Alembic autogenerate and code reuse.

Importing every model here ensures they register against `Base.metadata`,
so `create_all()` picks them up on next boot. The ingestion tables are inert
in Phase 1 and populated by Phase-2 adapters.
"""

from app.models.briefing import Briefing
from app.models.ingestion import (
    CalendarEvent,
    DeskNote,
    IngestionRun,
    MarketQuote,
    NewsItem,
    VolMetric,
)

__all__ = [
    "Briefing",
    "NewsItem",
    "CalendarEvent",
    "MarketQuote",
    "DeskNote",
    "VolMetric",
    "IngestionRun",
]
