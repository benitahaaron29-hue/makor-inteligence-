/**
 * TradingEconomics calendar adapter.
 *
 * Endpoint: https://api.tradingeconomics.com/calendar
 *
 * Auth: append "?c={KEY}" where KEY is either:
 *   - A registered API key (paid tier or free email-registered tier)
 *   - "guest:guest" — TE's public sandbox key with limited country coverage
 *
 * Server-side env var: TRADINGECONOMICS_KEY  (NOT prefixed NEXT_PUBLIC_;
 * the key must stay server-only — Vercel inlines NEXT_PUBLIC_* into the
 * client bundle, which would leak the key).
 *
 * Response format: array of objects with fields including
 * Date · Country · Category · Event · Actual · Previous · Forecast ·
 * Importance · URL · LastUpdate.
 *
 * Failure handling: any non-2xx, timeout, parse error, or empty payload
 * throws. The calling service catches the throw and returns an empty
 * list with the error attached — the briefing then reads "Calendar
 * source unavailable" rather than fabricating events.
 */

const TE_BASE = "https://api.tradingeconomics.com";
const FETCH_TIMEOUT_MS = 5_000;

export interface RawTeEvent {
  CalendarId?: number;
  Date?: string;
  Country?: string;
  Category?: string;
  Event?: string;
  Reference?: string;
  ReferenceDate?: string;
  Source?: string;
  SourceURL?: string;
  Actual?: string | null;
  Previous?: string | null;
  Forecast?: string | null;
  TEForecast?: string | null;
  URL?: string;
  Importance?: number;
  LastUpdate?: string;
  Currency?: string;
}

/**
 * Build the auth segment of the URL.
 *
 * Default to TradingEconomics's "guest:guest" public-sandbox key when no
 * env var is set. That key returns limited but real data and lets the
 * Vercel demo work without operator registration; production deployments
 * should set TRADINGECONOMICS_KEY to a real key for full coverage.
 */
function authKey(): string {
  const raw = (process.env.TRADINGECONOMICS_KEY ?? "").trim();
  return raw.length > 0 ? raw : "guest:guest";
}

export interface FetchTeOptions {
  /** Comma-separated list of country names ("united states,euro area"). */
  countries?: string[];
  /** ISO date YYYY-MM-DD; inclusive lower bound. */
  d1?: string;
  /** ISO date YYYY-MM-DD; inclusive upper bound. */
  d2?: string;
}

/**
 * Fetch raw events from TradingEconomics. Returns the array verbatim
 * (no normalisation). The service layer is responsible for classification.
 */
export async function teFetchCalendar(options: FetchTeOptions = {}): Promise<RawTeEvent[]> {
  const params = new URLSearchParams();
  params.set("c", authKey());
  params.set("f", "json");
  if (options.countries && options.countries.length > 0) {
    params.set("country", options.countries.join(","));
  }
  if (options.d1) params.set("d1", options.d1);
  if (options.d2) params.set("d2", options.d2);

  const url = `${TE_BASE}/calendar?${params.toString()}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; MakorIntelligence/1.0)",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`tradingeconomics network error: ${msg}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`tradingeconomics HTTP ${res.status}`);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`tradingeconomics bad JSON: ${msg}`);
  }

  if (!Array.isArray(data)) {
    throw new Error("tradingeconomics: unexpected response shape (expected array)");
  }

  return data as RawTeEvent[];
}

/** True when a real registered key is configured (not the guest fallback). */
export function teKeyIsRegistered(): boolean {
  const raw = (process.env.TRADINGECONOMICS_KEY ?? "").trim();
  return raw.length > 0 && raw !== "guest:guest";
}
