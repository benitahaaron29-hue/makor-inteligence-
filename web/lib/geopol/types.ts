/**
 * Geopolitical / government event layer — canonical shapes.
 *
 * Bridges the gap between standard economic calendar releases (already
 * covered by TradingEconomics) and pure market headlines (already covered
 * by the BBC/AP feeds). The events captured here are government-driven
 * actions and announcements that frequently move FX, rates, and commodity
 * markets more than data prints do:
 *
 *   - Leader speeches (heads of state, finance ministers, foreign secs)
 *   - Sanctions packages
 *   - Tariff announcements
 *   - Trade agreements
 *   - Fiscal-policy announcements (budgets, stimulus, tax changes)
 *   - G7 / G20 / NATO summits
 *   - Election announcements / results
 *   - Geopolitical escalation (war, strike, hostilities)
 *   - Commodity-supply decisions (OPEC, embargoes)
 *   - Emergency meetings
 *
 * Each item is pulled from a public, no-auth RSS/Atom feed published by
 * the source organisation itself. We extract ONLY the title, link, and
 * publication time — the upstream article body is never captured. The
 * classifier assigns a kind + relevance based on title patterns; the
 * `market_impact` frame is desk-authored per source so even unclassified
 * items carry structural context for the LLM.
 */

export type GeoOrg =
  | "WhiteHouse"
  | "StateDept"
  | "USTreasury"
  | "USTR"
  | "UKPM"
  | "HMTreasury"
  | "UKFCDO"
  | "EUCommission"
  | "IMF"
  | "WorldBank"
  | "OPEC";

/**
 * Coarse classification used both to filter the briefing context and to
 * label items in the UI. Order is rough relevance-descending; the
 * classifier picks the first pattern that matches.
 */
export type GeoKind =
  | "sanctions"
  | "tariff"
  | "trade-deal"
  | "escalation"
  | "commodity-supply"
  | "fiscal-policy"
  | "emergency"
  | "summit"
  | "election"
  | "leader-speech"
  | "policy-statement"
  | "press-release";

/**
 * High → keep in briefing context unconditionally.
 * Medium → keep when slot is available.
 * Low → drop from the briefing context (still surfaced in diagnostics).
 */
export type GeoRelevance = "high" | "medium" | "low";

export interface GeoEvent {
  /** Stable id: FNV-1a hash of (org + datetime + title). */
  id: string;
  org: GeoOrg;
  /** Display label for the source, e.g. "The White House", "HM Treasury". */
  source: string;
  source_url: string;
  /** ISO 8601 of upstream publication. */
  datetime: string;
  title: string;
  kind: GeoKind;
  relevance: GeoRelevance;
  /** Desk-authored per-source frame: why items from this source matter today. */
  market_impact: string;
  /** Country / region tag for UI grouping. */
  region: "US" | "UK" | "EU" | "Global" | "OPEC";
  fetched_at: string;
}

/**
 * Per-source registry entry. Adding a new geopolitical source is one
 * entry in feeds.ts; service + renderer code does not change.
 */
export interface GeoSourceSpec {
  org: GeoOrg;
  /** Display label shown in the UI footer and provenance. */
  source: string;
  region: GeoEvent["region"];
  /** Public RSS/Atom URL — the only data dependency this source has. */
  feed_url: string;
  /** Desk-authored "why items from this source matter to FX/rates today". */
  market_impact: string;
  /**
   * Tier classification. A "tier-1" source's press releases default to
   * at least medium relevance even when no specific kind pattern fires;
   * a "tier-2" source's items default to low. The tier reflects the
   * organisation's structural ability to move markets, not the
   * importance of any single release.
   */
  tier: 1 | 2;
}
