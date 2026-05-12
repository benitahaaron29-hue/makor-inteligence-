/**
 * Yahoo Finance adapter.
 *
 * Yahoo's `/v8/finance/chart` endpoint is unofficial but stable; it has
 * been the de-facto free quote source for years. Two operational notes:
 *
 *   1. A non-default User-Agent is required — without it the endpoint
 *      occasionally returns 401.
 *   2. Free quotes are delayed ~15 minutes for exchange-traded instruments.
 *      For continuously-traded FX it is effectively realtime.
 *
 * The adapter only resolves `regularMarketPrice` from the response meta.
 * It does NOT consult `chart.result.indicators` (the bar series) — those
 * land in B-D.3 when charts begin pulling real intraday curves.
 */

import type { MarketAdapter, AdapterSpec } from "./base";
import type { MarketQuote } from "../types";

const YAHOO_BASE = "https://query1.finance.yahoo.com/v8/finance/chart";
const FETCH_TIMEOUT_MS = 5_000;

interface YahooChartResponse {
  chart: {
    result:
      | Array<{
          meta: {
            regularMarketPrice?: number;
            regularMarketTime?: number;
            symbol?: string;
            currency?: string;
            exchangeName?: string;
            gmtoffset?: number;
            chartPreviousClose?: number;
          };
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              close?: (number | null)[];
            }>;
          };
        }>
      | null;
    error?: { code: string; description: string } | null;
  };
}

/** Time-series point: epoch seconds + value. */
export interface TimeSeriesPoint {
  t: number;
  v: number;
}

/** Intraday series returned by `yahooFetchSeries`. */
export interface TimeSeries {
  instrument: string;
  source: string;
  source_symbol: string;
  interval_seconds: number;
  range: string;
  previous_close: number | null;
  points: TimeSeriesPoint[];
  fetched_at: string;
}

export const yahooAdapter: MarketAdapter = {
  name: "Yahoo Finance",
  delay_minutes: 15,

  async fetch(instrument: string, spec: AdapterSpec): Promise<MarketQuote> {
    const url =
      `${YAHOO_BASE}/${encodeURIComponent(spec.symbol)}` +
      `?interval=1m&range=1d`;
    const fetched_at = new Date().toISOString();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MakorIntelligence/1.0)",
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`yahoo network error: ${msg}`);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      throw new Error(`yahoo HTTP ${res.status}`);
    }

    let data: YahooChartResponse;
    try {
      data = (await res.json()) as YahooChartResponse;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`yahoo bad JSON: ${msg}`);
    }

    if (data.chart?.error) {
      throw new Error(`yahoo: ${data.chart.error.description}`);
    }

    const result = data.chart?.result?.[0];
    if (!result) {
      throw new Error("yahoo: empty result");
    }

    const price = result.meta.regularMarketPrice;
    if (typeof price !== "number" || !Number.isFinite(price)) {
      throw new Error("yahoo: missing regularMarketPrice");
    }

    const ts = result.meta.regularMarketTime;
    const source_updated_at =
      typeof ts === "number" ? new Date(ts * 1000).toISOString() : null;

    return {
      instrument,
      value: price,
      unit: spec.unit,
      source: this.name,
      source_symbol: spec.symbol,
      fetched_at,
      source_updated_at,
      status: "delayed",
      delay_minutes: this.delay_minutes,
      error: null,
    };
  },
};

/**
 * Fetch an intraday series for one symbol. Returns the cleaned, null-free
 * (timestamp, close) pairs from Yahoo's chart endpoint. Throws on any
 * upstream failure — callers fall through to "data unavailable" rather
 * than synthesise a series.
 *
 *   interval: "5m" / "15m" / "30m" / "1h"  (default "15m")
 *   range:    "1d" / "5d" / "1mo"          (default "1d")
 *
 * Chosen defaults: 15m bars over the last day are enough to show overnight
 * movement on a briefing chart card without overwhelming the SVG path.
 */
export async function yahooFetchSeries(
  symbol: string,
  options: { interval?: string; range?: string } = {},
): Promise<TimeSeries> {
  const interval = options.interval ?? "15m";
  const range = options.range ?? "1d";
  const url =
    `${YAHOO_BASE}/${encodeURIComponent(symbol)}` +
    `?interval=${encodeURIComponent(interval)}&range=${encodeURIComponent(range)}`;
  const fetched_at = new Date().toISOString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MakorIntelligence/1.0)",
        Accept: "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`yahoo series network error: ${msg}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`yahoo series HTTP ${res.status}`);
  }

  let data: YahooChartResponse;
  try {
    data = (await res.json()) as YahooChartResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`yahoo series bad JSON: ${msg}`);
  }

  if (data.chart?.error) {
    throw new Error(`yahoo series: ${data.chart.error.description}`);
  }

  const result = data.chart?.result?.[0];
  if (!result) {
    throw new Error("yahoo series: empty result");
  }

  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const points: TimeSeriesPoint[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i];
    const v = closes[i];
    if (typeof t === "number" && typeof v === "number" && Number.isFinite(v)) {
      points.push({ t, v });
    }
  }

  if (points.length === 0) {
    throw new Error("yahoo series: no valid points");
  }

  const interval_seconds =
    interval.endsWith("m")
      ? parseInt(interval.slice(0, -1), 10) * 60
      : interval.endsWith("h")
      ? parseInt(interval.slice(0, -1), 10) * 3600
      : 60;

  return {
    instrument: symbol,
    source: "Yahoo Finance",
    source_symbol: symbol,
    interval_seconds,
    range,
    previous_close:
      typeof result.meta.chartPreviousClose === "number"
        ? result.meta.chartPreviousClose
        : null,
    points,
    fetched_at,
  };
}
