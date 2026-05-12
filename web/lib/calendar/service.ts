/**
 * Calendar service — orchestration layer.
 *
 * Flow per call:
 *   1. Demo-mode guard: return [] when DEMO_MODE is on. Callers handle
 *      the empty list; the briefing renders "Calendar source unavailable"
 *      (or the bundled mock when in demo mode at the briefing level).
 *   2. Cache hit: return cached list if fresh (5 min TTL).
 *   3. Fetch from TradingEconomics, classify each event, filter to a
 *      sensible desk window, sort chronologically, cache, return.
 *   4. On any failure, return [] and attach the error reason to the
 *      module-level last-error log for /api/diag introspection. Never
 *      fabricate a calendar.
 */

import { cacheGet, cacheSet } from "@/lib/market/cache";
import { isDemoMode } from "@/lib/api/demo";
import {
  teFetchCalendar,
  teKeyIsRegistered,
  type RawTeEvent,
} from "./adapters/tradingeconomics";
import {
  classifyEvent,
  eventId,
  normaliseCountry,
} from "./classifier";
import type { CalendarEvent } from "./types";

const CACHE_TTL_SECONDS = 300; // 5 min
const CACHE_KEY = "calendar::tradingeconomics::default-window";

/**
 * Default country set for the desk's morning briefing. Anything outside
 * this list is dropped from the briefing's `key_events` to keep noise
 * down; the full upstream list is still returned by /api/calendar so
 * power users can drill in.
 */
const DEFAULT_DESK_COUNTRIES = [
  "United States",
  "Euro Area",
  "United Kingdom",
  "Germany",
  "Japan",
  "Switzerland",
  "China",
  "Canada",
];

/** How many days of events the briefing surfaces by default. */
const DEFAULT_WINDOW_DAYS = 7;

interface DiagState {
  last_fetched_at: string | null;
  last_error: string | null;
  last_count: number;
  upstream: "tradingeconomics";
  key_status: "registered" | "guest-fallback";
}

const DIAG: DiagState = {
  last_fetched_at: null,
  last_error: null,
  last_count: 0,
  upstream: "tradingeconomics",
  key_status: teKeyIsRegistered() ? "registered" : "guest-fallback",
};

/**
 * Convert a TradingEconomics raw row to the canonical CalendarEvent.
 * The TE Date is the local time of the country reporting — we extract
 * HH:MM verbatim for display rather than attempting a country→TZ math
 * (that lands in Phase 2.2 if it becomes a desk pain point).
 */
function normalise(raw: RawTeEvent): CalendarEvent | null {
  const event = (raw.Event ?? "").trim();
  if (!event) return null;

  const datetime = (raw.Date ?? "").trim();
  if (!datetime) return null;

  // datetime is typically "2026-05-12T13:30:00" without TZ. We extract
  // YYYY-MM-DD and HH:MM directly without parsing through Date() so we
  // don't accidentally apply the server's timezone.
  const isoMatch = datetime.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  const date = isoMatch ? isoMatch[1] : "";
  const time = isoMatch ? isoMatch[2] : "";
  if (!date || !time) return null;

  const country = normaliseCountry(raw.Country);
  const classification = classifyEvent({
    event,
    category: raw.Category,
    upstream_importance: raw.Importance,
  });

  return {
    id: eventId(country, datetime, event),
    datetime,
    date,
    time,
    country,
    event,
    importance: classification.importance,
    category: classification.category,
    forecast: raw.Forecast ?? raw.TEForecast ?? null,
    previous: raw.Previous ?? null,
    actual: raw.Actual ?? null,
    market_impact: classification.market_impact,
    source: "TradingEconomics",
    source_url: raw.URL ? `https://tradingeconomics.com${raw.URL}` : null,
    fetched_at: new Date().toISOString(),
  };
}

function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Returns the desk's calendar — sourced, classified, sorted. */
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  if (isDemoMode()) return [];

  const cached = cacheGet<CalendarEvent[]>(CACHE_KEY);
  if (cached) return cached;

  const d1 = todayIsoUtc();
  const d2 = plusDaysIso(d1, DEFAULT_WINDOW_DAYS);

  let raw: RawTeEvent[];
  try {
    raw = await teFetchCalendar({
      countries: DEFAULT_DESK_COUNTRIES,
      d1,
      d2,
    });
  } catch (err) {
    DIAG.last_error = err instanceof Error ? err.message : String(err);
    DIAG.last_fetched_at = new Date().toISOString();
    DIAG.last_count = 0;
    return [];
  }

  const events: CalendarEvent[] = [];
  for (const r of raw) {
    const normalised = normalise(r);
    if (normalised) events.push(normalised);
  }

  // Sort chronologically.
  events.sort((a, b) => a.datetime.localeCompare(b.datetime));

  cacheSet(CACHE_KEY, events, CACHE_TTL_SECONDS);
  DIAG.last_error = null;
  DIAG.last_fetched_at = new Date().toISOString();
  DIAG.last_count = events.length;

  return events;
}

/** Diagnostics for /api/diag introspection. */
export function calendarDiagnostics(): DiagState {
  return { ...DIAG };
}
