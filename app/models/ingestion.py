"""Ingestion ORM models — Phase 2 store for the source adapters.

These tables are created on next boot (via `Base.metadata.create_all`) but are
not yet written to. Concrete adapters land in Phase 2 and populate them via
the repository layer (TBD).

Schema decisions:
  - Every record carries `source` + `source_id` so re-runs upsert.
  - Raw upstream payload is preserved in a JSON `raw` column for forensics.
  - `ingested_at` is server_default(now()) so the audit trail survives clock
    skew between adapters and the DB.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import Uuid

from app.db.base import Base


# ============================================================ NEWS ITEMS

class NewsItem(Base):
    """A single headline / story ingested from a news source."""

    __tablename__ = "news_items"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="news_items_source_pair_unique"),
        Index("ix_news_items_published_at", "published_at"),
        Index("ix_news_items_source", "source"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)
    headline: Mapped[str] = mapped_column(String(1024), nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    region: Mapped[str | None] = mapped_column(String(64), nullable=True)
    importance: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    raw: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )


# ============================================================ CALENDAR EVENTS

class CalendarEvent(Base):
    """An economic-calendar event ingested from TE / Investing / ForexFactory.

    Distinct from `briefings.key_events`: that JSON column is denormalized
    onto the briefing artifact; this table is the canonical store.
    """

    __tablename__ = "calendar_events"
    __table_args__ = (
        UniqueConstraint("source", "source_id", name="calendar_events_source_pair_unique"),
        Index("ix_calendar_events_event_time", "event_time_utc"),
        Index("ix_calendar_events_region", "region"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    source_id: Mapped[str] = mapped_column(String(255), nullable=False)
    event_time_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    region: Mapped[str] = mapped_column(String(8), nullable=False)
    name: Mapped[str] = mapped_column(String(512), nullable=False)
    importance: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    forecast: Mapped[str | None] = mapped_column(String(128), nullable=True)
    previous: Mapped[str | None] = mapped_column(String(128), nullable=True)
    actual: Mapped[str | None] = mapped_column(String(128), nullable=True)
    raw: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )


# ============================================================ MARKET QUOTES

class MarketQuote(Base):
    """A market data point ingested from Yahoo / FRED / AlphaVantage / BBG."""

    __tablename__ = "market_quotes"
    __table_args__ = (
        Index("ix_market_quotes_symbol_ts", "symbol", "ts_utc"),
        Index("ix_market_quotes_source_ts", "source", "ts_utc"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    instrument_class: Mapped[str] = mapped_column(String(32), nullable=False)  # fx / rates / equities / commodities
    symbol: Mapped[str] = mapped_column(String(32), nullable=False)
    last: Mapped[float] = mapped_column(Float, nullable=False)
    bid: Mapped[float | None] = mapped_column(Float, nullable=True)
    ask: Mapped[float | None] = mapped_column(Float, nullable=True)
    ts_utc: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    raw: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )


# ============================================================ DESK NOTES

class DeskNote(Base):
    """A note ingested from the Outlook desk inbox, notes folder, or sales post."""

    __tablename__ = "desk_notes"
    __table_args__ = (
        Index("ix_desk_notes_sent_at", "sent_at"),
        Index("ix_desk_notes_source", "source"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(64), nullable=False)  # outlook / notes_folder / sales_post
    author: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(512), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    tags: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    raw: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )


# ============================================================ VOLATILITY METRICS

class VolMetric(Base):
    """A volatility surface point ingested from the Excel sheet / CME / CVOL."""

    __tablename__ = "vol_metrics"
    __table_args__ = (
        Index("ix_vol_metrics_instr_tenor", "instrument", "tenor", "as_of"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    instrument: Mapped[str] = mapped_column(String(32), nullable=False)
    tenor: Mapped[str] = mapped_column(String(8), nullable=False)
    atm_vol: Mapped[float | None] = mapped_column(Float, nullable=True)
    rr_25d: Mapped[float | None] = mapped_column(Float, nullable=True)
    bf_25d: Mapped[float | None] = mapped_column(Float, nullable=True)
    as_of: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    raw: Mapped[dict[str, Any]] = mapped_column(JSON, nullable=False, default=dict)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False,
    )


# ============================================================ INGESTION RUNS

class IngestionRun(Base):
    """Audit log — one row per adapter invocation.

    A single query against this table answers "is the desk healthy?"
    """

    __tablename__ = "ingestion_runs"
    __table_args__ = (
        Index("ix_ingestion_runs_source_started", "source", "started_at"),
        Index("ix_ingestion_runs_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source: Mapped[str] = mapped_column(String(64), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False)  # success / partial / failed
    records_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
