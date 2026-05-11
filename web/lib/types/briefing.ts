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
