/**
 * Market-data canonical shape.
 *
 * Every numerical value returned by the market-data layer is wrapped in a
 * `MarketQuote` with full provenance: source, source-symbol, when it was
 * fetched, when the source itself last updated, and a status enum that
 * the UI uses to decide between rendering the number and rendering
 * "data unavailable". Three hard invariants:
 *
 *   1. value === null  ⇔  status === "unavailable"
 *   2. value !== null  ⇒  source !== null AND fetched_at !== null
 *   3. Adapters never synthesise. If an adapter cannot fetch, it raises;
 *      the service walks the fallback chain; if every adapter fails, the
 *      service returns an unavailable quote — never a fabricated number.
 */

export type QuoteStatus = "live" | "delayed" | "stale" | "unavailable";
export type QuoteUnit = "price" | "yield" | "pct" | "ratio" | "index";

export interface MarketQuote {
  /** Canonical instrument name, e.g. "EUR/USD" / "US 10Y" / "Brent". */
  instrument: string;
  /** Numeric value, or null when unavailable. */
  value: number | null;
  /** What the value represents — drives UI formatting (decimals, % suffix). */
  unit: QuoteUnit;
  /** Human-readable source attribution. Null when unavailable. */
  source: string | null;
  /** Upstream ticker that produced the value, e.g. "EURUSD=X". */
  source_symbol: string | null;
  /** ISO 8601, when this server-side fetch happened. */
  fetched_at: string;
  /** ISO 8601, when the source itself stamped the value. Null if unknown. */
  source_updated_at: string | null;
  /** Live (<60s), delayed (~15m), stale (older), or unavailable (no value). */
  status: QuoteStatus;
  /** Source delay vs realtime, in minutes. Null when unavailable. */
  delay_minutes: number | null;
  /** Human-readable cause string when status="unavailable", else null. */
  error: string | null;
}

/** Build an unavailable quote. Used by the service when every adapter fails. */
export function unavailable(instrument: string, error: string): MarketQuote {
  return {
    instrument,
    value: null,
    unit: "price",
    source: null,
    source_symbol: null,
    fetched_at: new Date().toISOString(),
    source_updated_at: null,
    status: "unavailable",
    delay_minutes: null,
    error,
  };
}
