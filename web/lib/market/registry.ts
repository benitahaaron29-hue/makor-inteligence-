/**
 * Instrument registry — the single source of truth for which adapters
 * fetch which instruments and in what order.
 *
 * Keys are URL-safe slugs ("eurusd", "us2y") so REST paths stay simple.
 * Each spec carries the canonical human-readable name and the ordered
 * adapter chain. Adding a new instrument or swapping primary/backup is a
 * one-line edit here — no code change required.
 *
 * B-D.1 ships with Yahoo Finance as the only working adapter. FRED is
 * referenced for US 2Y but the adapter itself lands in B-D.2; until then,
 * /api/market/quote/us2y returns an `unavailable` quote with the error
 * "fred: not yet implemented", which is honest and never fabricated.
 */

import type { QuoteUnit } from "./types";

export type AdapterName = "yahoo" | "fred" | "stooq" | "ecb";

export interface AdapterChainEntry {
  adapter: AdapterName;
  /** Upstream ticker for this adapter. */
  symbol: string;
  unit: QuoteUnit;
  /** Cache lifetime for this (instrument, adapter) pair. */
  ttl_seconds: number;
}

export interface InstrumentSpec {
  /** Canonical human-readable name shown in the UI. */
  canonical: string;
  /** Ordered list of adapter handles. Service tries each in turn. */
  chain: AdapterChainEntry[];
}

// Cache lifetimes by data cadence
const TTL_INTRADAY = 60;          // 1 min for tick-level series
const TTL_DAILY = 30 * 60;        // 30 min for daily fixings / yields

export const REGISTRY: Record<string, InstrumentSpec> = {
  eurusd: {
    canonical: "EUR/USD",
    chain: [
      { adapter: "yahoo", symbol: "EURUSD=X", unit: "price", ttl_seconds: TTL_INTRADAY },
    ],
  },
  dxy: {
    canonical: "DXY",
    chain: [
      { adapter: "yahoo", symbol: "DX-Y.NYB", unit: "index", ttl_seconds: TTL_INTRADAY },
    ],
  },
  us2y: {
    canonical: "US 2Y",
    chain: [
      // FRED ships in B-D.2. Until then this returns unavailable, honestly.
      { adapter: "fred", symbol: "DGS2", unit: "yield", ttl_seconds: TTL_DAILY },
    ],
  },
  us10y: {
    canonical: "US 10Y",
    chain: [
      // Yahoo quotes ^TNX as a percentage already (e.g. 4.45 = 4.45%).
      { adapter: "yahoo", symbol: "^TNX", unit: "yield", ttl_seconds: TTL_INTRADAY },
    ],
  },
  brent: {
    canonical: "Brent",
    chain: [
      { adapter: "yahoo", symbol: "BZ=F", unit: "price", ttl_seconds: TTL_INTRADAY },
    ],
  },
  gold: {
    canonical: "Gold",
    chain: [
      { adapter: "yahoo", symbol: "GC=F", unit: "price", ttl_seconds: TTL_INTRADAY },
    ],
  },
  vix: {
    canonical: "VIX",
    chain: [
      { adapter: "yahoo", symbol: "^VIX", unit: "index", ttl_seconds: TTL_INTRADAY },
    ],
  },

  // Additional FX majors (Stab-4.3) — populate the institutional
  // majors table without leaving empty reference columns.
  gbpusd: {
    canonical: "GBP/USD",
    chain: [
      { adapter: "yahoo", symbol: "GBPUSD=X", unit: "price", ttl_seconds: TTL_INTRADAY },
    ],
  },
  usdjpy: {
    canonical: "USD/JPY",
    chain: [
      { adapter: "yahoo", symbol: "USDJPY=X", unit: "price", ttl_seconds: TTL_INTRADAY },
    ],
  },
  usdchf: {
    canonical: "USD/CHF",
    chain: [
      { adapter: "yahoo", symbol: "USDCHF=X", unit: "price", ttl_seconds: TTL_INTRADAY },
    ],
  },
  audusd: {
    canonical: "AUD/USD",
    chain: [
      { adapter: "yahoo", symbol: "AUDUSD=X", unit: "price", ttl_seconds: TTL_INTRADAY },
    ],
  },
  usdcad: {
    canonical: "USD/CAD",
    chain: [
      { adapter: "yahoo", symbol: "USDCAD=X", unit: "price", ttl_seconds: TTL_INTRADAY },
    ],
  },
  usdmxn: {
    canonical: "USD/MXN",
    chain: [
      { adapter: "yahoo", symbol: "USDMXN=X", unit: "price", ttl_seconds: TTL_INTRADAY },
    ],
  },
  usdcnh: {
    canonical: "USD/CNH",
    chain: [
      { adapter: "yahoo", symbol: "USDCNH=X", unit: "price", ttl_seconds: TTL_INTRADAY },
    ],
  },
};

/** The seed instrument set covered by B-D.1 → B-D.2. */
export const SEED_SLUGS = Object.keys(REGISTRY);

/**
 * Resolve a URL slug or canonical name to a registry spec.
 * Lookup is case-insensitive and tolerates a small set of common aliases
 * ("EUR/USD", "EURUSD", "eur_usd" all resolve to the same spec).
 */
export function resolveInstrument(raw: string): {
  slug: string;
  spec: InstrumentSpec;
} | null {
  const normalised = raw
    .toLowerCase()
    .replace(/[\s\/_-]+/g, "")
    .trim();
  for (const [slug, spec] of Object.entries(REGISTRY)) {
    if (slug === normalised) return { slug, spec };
    const canonNorm = spec.canonical.toLowerCase().replace(/[\s\/_-]+/g, "");
    if (canonNorm === normalised) return { slug, spec };
  }
  return null;
}
