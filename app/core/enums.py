"""Domain enums — institutional taxonomy for briefings, markets, and assets."""

from __future__ import annotations

from enum import StrEnum


class BriefingStatus(StrEnum):
    """Lifecycle status of a Morning Briefing artifact."""

    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    FAILED = "failed"


class BriefingType(StrEnum):
    """Briefing cadence / desk product."""

    MORNING_FX_MACRO = "morning_fx_macro"
    MIDDAY_UPDATE = "midday_update"
    WEEKLY_OUTLOOK = "weekly_outlook"
    SPECIAL_REPORT = "special_report"


class AssetClass(StrEnum):
    """Top-level asset class taxonomy."""

    FX = "fx"
    RATES = "rates"
    EQUITIES = "equities"
    COMMODITIES = "commodities"
    CREDIT = "credit"
    CRYPTO = "crypto"


class RiskTone(StrEnum):
    """Risk sentiment classification used across desk commentary."""

    RISK_ON = "risk_on"
    RISK_OFF = "risk_off"
    NEUTRAL = "neutral"
    MIXED = "mixed"


class GenerationSource(StrEnum):
    """Source of generated content — distinguishes mocks from live AI runs."""

    MOCK = "mock"
    ANTHROPIC = "anthropic"
    HUMAN = "human"
    HYBRID = "hybrid"
