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
