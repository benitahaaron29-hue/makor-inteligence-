/**
 * Type definitions mirroring the backend Pydantic schemas in
 * app/schemas/briefing.py. Keep these in sync if the API changes.
 */

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
