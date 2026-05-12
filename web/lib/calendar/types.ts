/**
 * Calendar canonical shape.
 *
 * Every event in the briefing carries enough provenance for an institutional
 * desk: timestamp, country, original source, fetched_at, plus the two
 * desk-relevant signals — importance and market_impact (the "why this
 * matters" frame).
 *
 * Importance levels (mapped from a rule-based classifier, NOT from the
 * upstream feed alone):
 *
 *   critical — first-tier market-moving prints (CPI, NFP, FOMC, major rate
 *              decisions). Headline desks reposition around these.
 *   high     — second-tier prints (PMIs, retail sales, auctions, Fed
 *              speakers). Watched but not always traded.
 *   medium   — routine releases that occasionally surprise.
 *   low      — minor regional surveys.
 *   unknown  — pattern did not match any rule. Honest signal that we
 *              cannot classify, not a downgrade to "low".
 *
 * market_impact:
 *   short editorial frame written by the desk (NOT the LLM in Phase 2.1)
 *   for ~15 known critical/high event patterns. For unmatched events the
 *   field is null — the LLM in Phase 2.4 can fill it from context, or the
 *   renderer omits it.
 */

export type EventImportance = "critical" | "high" | "medium" | "low" | "unknown";

export interface CalendarEvent {
  /** Stable id: hash of source + datetime + event. */
  id: string;
  /** ISO 8601 string. Country-local time when the upstream gives only
   *  local time (TradingEconomics); proper UTC when the source declares it. */
  datetime: string;
  /** Display date in YYYY-MM-DD. */
  date: string;
  /** Display time in HH:MM. */
  time: string;
  /** Canonical short region code: "US" / "EZ" / "UK" / "JP" / ... */
  country: string;
  /** Full event name as published by the upstream. */
  event: string;
  /** Classifier output — see top-of-file docstring. */
  importance: EventImportance;
  /** Internal category: inflation / labour / monetary / growth / auction /
   *  political / geopolitical / policy / survey / other */
  category: string;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  /** Why this matters for markets — null when no template applies. */
  market_impact: string | null;
  /** Source attribution surfaced in the UI provenance footer. */
  source: string;
  source_url: string | null;
  fetched_at: string;
}
