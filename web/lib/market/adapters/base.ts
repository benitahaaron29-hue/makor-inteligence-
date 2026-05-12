/**
 * Base interface every market-data adapter implements.
 *
 * Adapters are pure I/O: they accept an instrument + per-adapter spec,
 * fetch the upstream source, normalise the response into a `MarketQuote`,
 * and return it. They never:
 *
 *   - synthesise values (no fallback math, no interpolation)
 *   - cache anything (caching is the service's job)
 *   - decide which upstream to call next (that's the fallback chain)
 *
 * When an adapter cannot produce a real value it throws. The service
 * catches the throw, records the error, and tries the next adapter in
 * the chain. If every adapter throws, the service returns an
 * `unavailable` quote with the concatenated errors — never a number.
 */

import type { MarketQuote, QuoteUnit } from "../types";

export interface AdapterSpec {
  /** Upstream ticker for this adapter (e.g. Yahoo "EURUSD=X"). */
  symbol: string;
  unit: QuoteUnit;
}

export interface MarketAdapter {
  /** Short human-readable source label — shown to the user. */
  readonly name: string;
  /** Typical delay vs realtime, in minutes. 0 = live, 15 = typical free feed. */
  readonly delay_minutes: number;
  /** Fetch + normalise. Throws on any failure (the service handles fallback). */
  fetch(instrument: string, spec: AdapterSpec): Promise<MarketQuote>;
}
