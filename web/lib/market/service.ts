/**
 * Market-data service — single entry point for the rest of the app.
 *
 * Flow:
 *   1. resolve instrument slug → registry spec (or return unavailable if unknown)
 *   2. if demo mode is on, return unavailable("demo_mode") immediately
 *   3. walk the adapter chain in order:
 *        a. consult cache for (instrument, adapter) — if fresh, return
 *        b. call adapter.fetch — on success, cache + return
 *        c. on failure, record the error and try the next adapter
 *   4. if every adapter failed, return unavailable(all errors concatenated)
 *
 * The service NEVER fabricates a value. Adapters never fabricate either.
 * Honest failure is the only failure mode.
 */

import { yahooAdapter } from "./adapters/yahoo";
import type { MarketAdapter } from "./adapters/base";
import { REGISTRY, resolveInstrument, type AdapterName } from "./registry";
import { cacheGet, cacheSet } from "./cache";
import { unavailable, type MarketQuote } from "./types";

/**
 * Registered adapters. Adding FRED / Stooq / ECB in B-D.2 means dropping
 * one line in here plus the adapter module. The registry decides which
 * adapter handles which instrument; the service just dispatches.
 */
const ADAPTERS: Partial<Record<AdapterName, MarketAdapter>> = {
  yahoo: yahooAdapter,
  // fred  → B-D.2
  // stooq → B-D.2
  // ecb   → B-D.2
};

function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

export async function getQuote(rawInstrument: string): Promise<MarketQuote> {
  const resolved = resolveInstrument(rawInstrument);
  if (!resolved) {
    return unavailable(rawInstrument, `unknown instrument: ${rawInstrument}`);
  }
  const { spec } = resolved;
  const canonical = spec.canonical;

  if (isDemoMode()) {
    return unavailable(canonical, "demo_mode");
  }

  const errors: string[] = [];

  for (const link of spec.chain) {
    const adapter = ADAPTERS[link.adapter];
    if (!adapter) {
      errors.push(`${link.adapter}: not yet implemented`);
      continue;
    }

    const cacheKey = `${canonical}::${link.adapter}`;
    const cached = cacheGet<MarketQuote>(cacheKey);
    if (cached) return cached;

    try {
      const quote = await adapter.fetch(canonical, {
        symbol: link.symbol,
        unit: link.unit,
      });
      cacheSet(cacheKey, quote, link.ttl_seconds);
      return quote;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${link.adapter}: ${msg}`);
      // fall through to the next adapter in the chain
    }
  }

  return unavailable(canonical, `All upstream sources failed: ${errors.join("; ")}`);
}

/** Convenience for callers that want every seed instrument at once. */
export async function getAllSeedQuotes(): Promise<MarketQuote[]> {
  const slugs = Object.keys(REGISTRY);
  return Promise.all(slugs.map((slug) => getQuote(slug)));
}
