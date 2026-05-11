"""Intelligence layer schema — the rich editorial payload attached to a briefing.

This is the structured content the briefing-reader uses to render Strategist's
View callouts, "What changed since yesterday" blocks, key takeaways, trade
ideas with levels/stops/catalysts, central-bank watch cards, pair-level
commentary, positioning notes, session breakdowns, cross-asset links,
pull-stats, risk warnings, consensus-vs-skew calls, and per-section
provenance footers.

In Phase 1 the mock generator emits this payload deterministically. In
Phase 2 the AI synthesis writes here directly.
"""

from __future__ import annotations

from pydantic import BaseModel, Field


# ============================================================ EDITORIAL CALLOUTS


class StrategistView(BaseModel):
    """One-paragraph desk view rendered in a left-bar callout."""

    headline: str
    body: str


class WhatChanged(BaseModel):
    """Delta vs yesterday's close — rendered as a tight block under the lede."""

    summary: str
    deltas: list[str] = Field(default_factory=list)


class KeyTakeaway(BaseModel):
    """One numbered bullet in the top-of-briefing summary box."""

    rank: int
    text: str


class PullStat(BaseModel):
    """A quotable number rendered as a callout inside a section body."""

    section: str          # which section id to attach to: regime / fx / vol / ...
    value: str            # e.g. "+0.18%" or "−4.2 bp"
    tone: str = "neu"     # pos / neg / neu / warn
    label: str            # the explanatory caption


class RiskWarning(BaseModel):
    """An explicit warning rendered above the calendar / inside key risks."""

    severity: str         # high / medium / low
    title: str
    body: str


class ConsensusCall(BaseModel):
    """Per-event consensus + risk skew + impact path."""

    event: str
    consensus: str
    risk_skew: str
    impact: str


# ============================================================ TRADE IDEAS


class TradeIdea(BaseModel):
    """A structured desk trade idea — Bloomberg morning-note shape."""

    rank: int
    theme: str
    direction: str        # "Long EUR/USD", "Short USD/JPY"
    vehicle: str          # "EUR/USD spot · 1m forward"
    entry: str
    target: str
    stop: str
    horizon: str
    conviction: float     # 0–10
    catalyst: str
    rationale: str
    vol_context: str


# ============================================================ CENTRAL BANK WATCH


class CentralBankItem(BaseModel):
    """One row in the Central Bank Watch section.

    Phase-2 enrichment carries the full Rates & Triggers framework: policy
    stance, inflation/growth sensitivities, QT/QE posture, week-on-week
    pricing change, hawkish-shift indicator, and an explicit trigger matrix.
    """

    bank: str
    short: str            # "Fed" / "ECB" / "BoE" / "BoJ" / "SNB"
    last_meeting: str
    next_meeting_date: str | None = None
    days_to_next: int | None = None
    market_pricing: str
    bias: str
    upcoming_speakers: list[str] = Field(default_factory=list)

    # Rates & Triggers framework
    policy_stance: str | None = None         # "Hold, easing bias" / "Cutting · gradual" / "Patient normalisation"
    inflation_sensitivity: str | None = None # "High" / "Medium" / "Low"
    growth_sensitivity: str | None = None    # same scale
    qt_stance: str | None = None             # "Runoff $60bn/mo since Sep 2025"
    pricing_change_1w: str | None = None     # "+8bp dovish · July cut prob 72% (was 64%)"
    hawkish_shift: int | None = None         # -2 (dovish shift) … +2 (hawkish shift)
    triggers: list[str] = Field(default_factory=list)  # explicit "if X then Y" rows


# ============================================================ FX PAIR INTELLIGENCE


class PairLevel(BaseModel):
    """A technical level for a pair."""

    label: str            # "Support", "Resistance", "Pivot", "Stop"
    value: str
    note: str | None = None


class PairCommentary(BaseModel):
    """Per-pair commentary with levels, vol context, bias."""

    pair: str
    spot: float
    bias: str
    one_day_pct: float
    one_week_pct: float
    one_month_atm: float
    rr_25d: float
    levels: list[PairLevel] = Field(default_factory=list)
    note: str


# ============================================================ POSITIONING & FLOW


class PositioningNote(BaseModel):
    """Flow / positioning color for an instrument."""

    instrument: str
    side: str             # Long / Short / Balanced
    weight: str           # "Moderate (15th pct vs 6m)"
    flow: str
    risk: str


# ============================================================ SESSION & CROSS-ASSET


class SessionBreakdown(BaseModel):
    """Three short paragraphs covering Asia / Europe / US."""

    asia: str
    europe: str
    us: str


class CrossAssetLink(BaseModel):
    """A single rates↔FX or FX↔commodity linkage observation."""

    title: str            # "Rates → FX"
    body: str


# ============================================================ MACRO OVERVIEW


class MacroOverview(BaseModel):
    """The intellectual anchor of the briefing — strategist-level synthesis
    that sits at the top of § 02 Macro Regime and frames the rest of the
    note. Four short blocks: overnight setup, what moved & why, rates
    interpretation, cross-asset thesis."""

    opening: str             # 2–3 paragraph macro setup
    whats_moving: str        # what moved overnight + why
    rates_view: str          # rates interpretation
    cross_asset_thesis: str  # cross-asset linkage thesis


class RiskScenario(BaseModel):
    """One explicit scenario in the macro risk map."""

    name: str               # "Soft CPI" / "In-line" / "Hot CPI"
    probability: str        # "35% · base case" / "20%"
    trigger: str            # numeric / qualitative threshold
    fx_impact: str
    rates_impact: str
    equity_impact: str


# ============================================================ GEOPOLITICAL


class GeopoliticalRegion(BaseModel):
    """One row in the geopolitical pulse section."""

    name: str                 # "US – China"
    short: str                # "USCH"
    intensity: int            # 0–100
    trend: str                # "Escalating" / "De-escalating" / "Stable"
    headline: str             # one-line current state
    detail: str               # one-paragraph narrative


class GeopoliticalPulse(BaseModel):
    """Top-of-section narrative + per-region rows."""

    narrative: str            # 1-paragraph synthesis across all regions
    regions: list[GeopoliticalRegion] = Field(default_factory=list)


# ============================================================ DESK PRIORITIES


class DeskPriority(BaseModel):
    """A single 'what we care about today' priority."""

    rank: int
    title: str                # short imperative
    body: str                 # one-line context
    timing: str | None = None # "12:30 GMT" / "All day"


# ============================================================ PROVENANCE


class ProvenanceEntry(BaseModel):
    """Per-section data lineage — sources + as-of timestamp."""

    section: str
    sources: list[str]
    as_of: str            # human-readable, e.g. "06:42 GMT"


# ============================================================ ROOT


class Intelligence(BaseModel):
    """Root container for the rich editorial payload."""

    strategist_view: StrategistView
    macro_overview: MacroOverview | None = None
    what_changed: WhatChanged
    key_takeaways: list[KeyTakeaway] = Field(default_factory=list)
    desk_priorities: list[DeskPriority] = Field(default_factory=list)
    risk_scenarios: list[RiskScenario] = Field(default_factory=list)
    trade_ideas: list[TradeIdea] = Field(default_factory=list)
    central_banks: list[CentralBankItem] = Field(default_factory=list)
    pair_commentary: list[PairCommentary] = Field(default_factory=list)
    positioning: list[PositioningNote] = Field(default_factory=list)
    session_breakdown: SessionBreakdown
    cross_asset: list[CrossAssetLink] = Field(default_factory=list)
    pull_stats: list[PullStat] = Field(default_factory=list)
    risk_warnings: list[RiskWarning] = Field(default_factory=list)
    consensus_calls: list[ConsensusCall] = Field(default_factory=list)
    geopolitical: GeopoliticalPulse | None = None
    provenance: list[ProvenanceEntry] = Field(default_factory=list)
