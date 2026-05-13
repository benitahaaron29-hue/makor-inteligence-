/** Mirrors the FastAPI Pydantic schemas in app/schemas/briefing.py. */

export type BriefingStatus = "draft" | "published" | "archived" | "failed";

export type BriefingType =
  | "morning_fx_macro"
  | "midday_update"
  | "weekly_outlook"
  | "special_report";

export type RiskTone = "risk_on" | "risk_off" | "mixed" | "neutral";
export type GenerationSource = "mock" | "anthropic" | "human" | "hybrid";

export interface KeyEvent {
  time_utc: string;
  region: string;
  event: string;
  importance: string;
  forecast: string | null;
  previous: string | null;
  // Desk enrichment populated by mock generator + Phase-2 calendar adapter
  speaker?: string | null;
  topic?: string | null;
  category?: string | null;
  sensitivity?: string | null;
  pairs_affected?: string[] | null;
  vol_impact?: string | null;
  desk_focus?: string | null;
}

export interface MarketSnapshot {
  fx: Record<string, number>;
  rates: Record<string, number>;
  equities: Record<string, number>;
  commodities: Record<string, number>;
  as_of: string | null;
}

export interface BriefingSummary {
  id: string;
  briefing_date: string;
  briefing_type: BriefingType;
  status: BriefingStatus;
  title: string;
  headline: string;
  risk_tone: RiskTone;
  published_at: string | null;
  created_at: string;
}

/**
 * Source-integrity flag — surfaces in the UI as a small disclosure when the
 * briefing was not built from live market data. Drives the demo banner and
 * future per-field source attribution.
 *
 *   "live"    — every numerical claim is backed by a connected source
 *   "partial" — narrative is sourced; some specific levels are illustrative
 *   "demo"    — Phase 1 template, market levels are illustrative only
 */
export type DataProvenance = "live" | "partial" | "demo";

export interface BriefingRead {
  id: string;
  briefing_date: string;
  briefing_type: BriefingType;
  status: BriefingStatus;
  title: string;
  headline: string;
  executive_summary: string;
  fx_commentary: string;
  rates_commentary: string;
  equities_commentary: string;
  commodities_commentary: string;
  risk_tone: RiskTone;
  key_events: KeyEvent[];
  risk_themes: string[];
  market_snapshot: MarketSnapshot;
  intelligence: Intelligence | null;
  generation_source: GenerationSource;
  generator_version: string;
  model_name: string | null;
  generation_metadata: Record<string, unknown>;
  desk: string;
  author: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Source-integrity layer — optional for backward compat with the Python
  // schema. When omitted, the renderer treats the briefing as "live".
  data_provenance?: DataProvenance | null;
  demo_disclosure?: string | null;
}

// ============================================================ INTELLIGENCE LAYER

export interface StrategistView {
  headline: string;
  body: string;
}

export interface WhatChanged {
  summary: string;
  deltas: string[];
}

export interface KeyTakeaway {
  rank: number;
  text: string;
}

/**
 * Legacy trade-idea shape — directive (entry/target/stop/conviction).
 * Retained for backward compatibility with the Python schema and any
 * existing briefings that still carry this shape. New briefings should
 * populate `instruments_to_watch` (the observational shape) instead.
 */
export interface TradeIdea {
  rank: number;
  theme: string;
  direction: string;
  vehicle: string;
  entry: string;
  target: string;
  stop: string;
  horizon: string;
  conviction: number;
  catalyst: string;
  rationale: string;
  vol_context: string;
}

/**
 * One Bloomberg/GS-style minimalist chart attached to the briefing.
 *
 * The chart system is deliberately small. The reader supports up to ~4
 * charts per briefing, each rendered as a single thin SVG line with
 * min/max y-labels and start/end x-labels. No gridlines, no decorative
 * gradients, no axis ticks, no legend. One narrative purpose per chart.
 *
 *   - kind: only "line" in v1; "area" / "bar" reserved for later
 *   - series: y-values, evenly spaced in time
 *   - baseline: optional reference line (e.g. previous close, zero,
 *       OIS-implied rate). Rendered as a dashed horizontal rule.
 *   - note: one short sentence stating WHY this chart is in the briefing
 *   - data_source: source attribution string — "Bloomberg", "Refinitiv",
 *       "CME FedWatch", or "Demo synthetic series" in Phase 1
 */
export interface Chart {
  rank: number;
  title: string;
  subtitle?: string | null;
  kind: "line";
  series: number[];
  baseline?: number | null;
  y_min_label?: string | null;
  y_max_label?: string | null;
  x_start_label?: string | null;
  x_end_label?: string | null;
  note?: string | null;
  data_source?: string | null;
}

/**
 * Observational, non-directive instrument watch card.
 *
 *   - instrument:  the asset name (e.g. "EUR/USD" / "US 2Y Treasury")
 *   - region:      optional grouping ("G10 FX" / "US rates" / "Energy")
 *   - why_today:   2–3 sentence note on why the desk is monitoring this today
 *   - catalyst:    the specific scheduled event or release
 *   - desk_focus:  what desks are watching — signal markers / level zones
 *
 * Never carries entry/target/stop/conviction. Tone is monitoring, not
 * recommending. Rendered as "Instruments to Watch" in the reader.
 */
export interface InstrumentWatch {
  rank: number;
  instrument: string;
  region?: string | null;
  why_today: string;
  catalyst: string;
  desk_focus: string;
}

export interface CentralBankItem {
  bank: string;
  short: string;
  last_meeting: string;
  next_meeting_date: string | null;
  days_to_next: number | null;
  market_pricing: string;
  bias: string;
  upcoming_speakers: string[];
  // Rates & Triggers framework
  policy_stance?: string | null;
  inflation_sensitivity?: string | null;
  growth_sensitivity?: string | null;
  qt_stance?: string | null;
  pricing_change_1w?: string | null;
  hawkish_shift?: number | null;  // -2 (dovish shift) … +2 (hawkish shift)
  triggers?: string[];
}

export interface PairLevel {
  label: string;
  value: string;
  note: string | null;
}

export interface PairCommentary {
  pair: string;
  spot: number;
  bias: string;
  one_day_pct: number;
  one_week_pct: number;
  one_month_atm: number;
  rr_25d: number;
  levels: PairLevel[];
  note: string;
}

export interface PositioningNote {
  instrument: string;
  side: string;
  weight: string;
  flow: string;
  risk: string;
}

export interface SessionBreakdown {
  asia: string;
  europe: string;
  us: string;
}

export interface CrossAssetLink {
  title: string;
  body: string;
}

export interface PullStat {
  section: string;
  value: string;
  tone: string;
  label: string;
}

export interface RiskWarning {
  severity: string;
  title: string;
  body: string;
}

export interface ConsensusCall {
  event: string;
  consensus: string;
  risk_skew: string;
  impact: string;
}

export interface ProvenanceEntry {
  section: string;
  sources: string[];
  as_of: string;
}

export interface DeskPriority {
  rank: number;
  title: string;
  body: string;
  timing: string | null;
}

export interface GeopoliticalRegion {
  name: string;
  short: string;
  intensity: number;
  trend: string;
  headline: string;
  detail: string;
}

export interface GeopoliticalPulse {
  narrative: string;
  regions: GeopoliticalRegion[];
}

export interface MacroOverview {
  opening: string;
  whats_moving: string;
  rates_view: string;
  cross_asset_thesis: string;
}

export interface RiskScenario {
  name: string;
  probability: string;
  trigger: string;
  fx_impact: string;
  rates_impact: string;
  equity_impact: string;
}

// Re-exported so consumers (renderer, generator) get the Headline shape
// from the same module they use for everything else briefing-related.
export type { Headline, HeadlineCategory, HeadlineRelevance } from "@/lib/headlines/types";
import type { Headline } from "@/lib/headlines/types";

// Central-bank canonical types — same re-export pattern.
export type { CBEvent, CBName, CBEventKind } from "@/lib/central-banks/types";
import type { CBEvent } from "@/lib/central-banks/types";

// Geopolitical / government event canonical types — same re-export
// pattern. Used by the renderer (Phase 3.3 will surface them) and the
// generator (passes them into the narrative context).
export type { GeoEvent, GeoOrg, GeoKind, GeoRelevance } from "@/lib/geopol/types";
import type { GeoEvent } from "@/lib/geopol/types";

export interface Intelligence {
  strategist_view: StrategistView;
  macro_overview: MacroOverview | null;
  what_changed: WhatChanged;
  key_takeaways: KeyTakeaway[];
  desk_priorities: DeskPriority[];
  risk_scenarios: RiskScenario[];
  trade_ideas: TradeIdea[];
  // New observational shape. When present, the reader renders this in the
  // "Instruments to Watch" section instead of trade_ideas. Optional for
  // backward compat — Phase-1 mock + Phase-2 generator both populate it.
  instruments_to_watch?: InstrumentWatch[];
  // Up to ~4 Bloomberg-style minimal line charts rendered at the top of
  // § 01 Overnight Movers. Optional — older briefings render without them.
  charts?: Chart[];
  // Last-24h public-RSS headlines (macro / geopolitical / energy /
  // fiscal), classified for market relevance with desk-authored
  // "why this matters" frames. Rendered inside § 07 Geopolitical Pulse.
  // Optional — empty / absent ⇒ no headlines block in the briefing.
  headlines?: Headline[];
  // Last-14d central-bank activity: statements, minutes, speeches,
  // press conferences, testimony. Pulled from each bank's own public
  // RSS feed (Fed, ECB, BoE, BoJ, SNB). Rendered as a "Recent activity"
  // sub-block inside § 06 Central Bank Watch.
  cb_events?: CBEvent[];
  // Last-14d geopolitical / government events: sanctions, tariffs,
  // trade actions, fiscal announcements, leader speeches, summits,
  // commodity-supply decisions. Pulled from each organisation's own
  // public RSS feed (White House, State, USTR, US Treasury, UK PM /
  // HMT / FCDO, EU Commission, IMF, World Bank, OPEC). Phase 3.3 will
  // surface them in §07 Geopolitical Pulse alongside the headline feed.
  geopol_events?: GeoEvent[];
  central_banks: CentralBankItem[];
  pair_commentary: PairCommentary[];
  positioning: PositioningNote[];
  session_breakdown: SessionBreakdown;
  cross_asset: CrossAssetLink[];
  pull_stats: PullStat[];
  risk_warnings: RiskWarning[];
  consensus_calls: ConsensusCall[];
  geopolitical: GeopoliticalPulse | null;
  provenance: ProvenanceEntry[];
}
