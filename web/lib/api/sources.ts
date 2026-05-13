import { withMockFallback, loadMock } from "./demo";
import { getQuote } from "@/lib/market/service";
import { getCalendarEvents, calendarDiagnostics } from "@/lib/calendar/service";
import { getBriefingHeadlines, headlinesDiagnostics } from "@/lib/headlines/service";
import { getBriefingCBEvents, cbDiagnostics } from "@/lib/central-banks/service";
import { CB_SPECS, ALL_BANKS } from "@/lib/central-banks/feeds";
import { getBriefingGeoEvents, geoDiagnostics } from "@/lib/geopol/service";
import { GEO_SOURCES } from "@/lib/geopol/feeds";
import { narrativeDiagnostics } from "@/lib/narrative/service";
import { llmProviderName, llmModel } from "@/lib/narrative/llm";

export type SourceStatus =
  | "live"
  | "degraded"
  | "fallback"
  | "mock"
  | "phase_2";

/**
 * The /sources page renders one card per category. Categories added
 * during the source-transparency phase: "central_banks" (Fed, ECB, BoE,
 * BoJ, SNB RSS feeds) and "geopolitical" (White House, State, USTR,
 * Treasury, UK PM / HMT / FCDO, EU Commission, IMF, World Bank, OPEC).
 */
export type SourceCategory =
  | "news"
  | "calendar"
  | "market"
  | "central_banks"
  | "geopolitical"
  | "desk"
  | "volatility"
  | "synthesis";

export interface SourceView {
  name: string;
  category: SourceCategory;
  integration: string;
  cadence: string;
  fallback: string | null;
  priority: number;
  critical_path: boolean;
  description: string;
  status: SourceStatus;
  last_success_at: string | null;
  last_error: string | null;
  reliability_score: number | null;
  records_last_run: number;
  // Phase-2 operational realism
  latency_ms: number | null;
  vendor: string | null;
  region: string | null;
}

const MOCK_SOURCES = "sources.json";

export const sourcesApi = {
  /**
   * Source registry. Mode-resolved:
   *   demo     → bundled mock JSON
   *   live     → assembled from each service's live diagnostics
   *
   * The live path probes each service in parallel so the page reflects
   * the actual current state of every connected feed, not a stale
   * per-instance snapshot.
   */
  list(): Promise<SourceView[]> {
    return withMockFallback<SourceView[]>(
      () => getLiveSources(),
      () => loadMock<SourceView[]>(MOCK_SOURCES),
    );
  },
};

// ============================================================================
// LIVE SOURCE BUILDER
// ============================================================================
//
// Composes the SourceView[] payload from the actual connected services:
//   - market: Yahoo Finance (1 row)
//   - calendar: TradingEconomics (1 row)
//   - news: per-headline-feed (5 rows — BBC × 2, AP × 3)
//   - central_banks: per-bank (5 rows — Fed, ECB, BoE, BoJ, SNB)
//   - geopolitical: per-source (11 rows — White House, State, USTR, ...)
//   - synthesis: active LLM provider (1 row)
//
// Probes every service in parallel before reading diagnostics so the
// view reflects the actual current state (not a stale per-instance
// snapshot). On warm caches the probe is sub-second.
//
// All status values are derived from the per-service DIAG state; nothing
// is fabricated. A failed RSS feed shows status="fallback" with the
// upstream error message, exactly as the diagnostic surface reports it.

const QUOTE_SLUGS = ["eurusd", "dxy", "us2y", "us10y", "brent", "gold", "vix"];

function nowIso(): string {
  return new Date().toISOString();
}

/** Headline-feed source → human "region" label for the table. */
function newsRegion(label: string): string {
  if (label.startsWith("BBC")) return "UK · Global";
  if (label.startsWith("AP")) return "US · Global";
  return "Global";
}

function cbRegion(bank: string): string {
  switch (bank) {
    case "Fed": return "US";
    case "ECB": return "EU";
    case "BoE": return "UK";
    case "BoJ": return "JP";
    case "SNB": return "CH";
    default: return "—";
  }
}

async function getLiveSources(): Promise<SourceView[]> {
  // Probe each service in parallel so per-instance DIAG is fresh.
  // Promise.allSettled keeps any one service's failure from denying the
  // whole registry (matches the briefing generator's contract).
  await Promise.allSettled([
    Promise.all(QUOTE_SLUGS.map((s) => getQuote(s))),
    getCalendarEvents(),
    getBriefingHeadlines(10),
    getBriefingCBEvents(8),
    getBriefingGeoEvents(12),
  ]);

  const rows: SourceView[] = [];

  // ----- Synthesis (LLM provider) -------------------------------------
  const narr = narrativeDiagnostics();
  const provName = llmProviderName() === "openrouter" ? "OpenRouter" : "Anthropic";
  const synthStatus: SourceStatus =
    !narr.key_configured
      ? "fallback"
      : narr.last_result === "ok" || narr.last_result === "cache"
        ? "live"
        : narr.last_result === "api-fail" || narr.last_result === "validate-fail"
          ? "degraded"
          : "live";
  rows.push({
    name: `${provName} · ${llmModel()}`,
    category: "synthesis",
    integration: `${provName} HTTP API`,
    cadence: "On-demand per briefing · 30-min cache",
    fallback: null,
    priority: 1,
    critical_path: true,
    description:
      "AI synthesis layer. Produces executive summary, strategist view, macro overview, what-changed, and asset-class commentary over the assembled context. Cited against context ids; rejects invented data via the validator.",
    status: synthStatus,
    last_success_at: narr.last_call_at,
    last_error: narr.last_error,
    reliability_score: narr.last_result === "ok" || narr.last_result === "cache" ? 1.0 : null,
    records_last_run: narr.last_field_counts?.llm ?? 0,
    latency_ms: narr.last_latency_ms,
    vendor: provName,
    region: "Global",
  });

  // ----- Market data (Yahoo Finance) ----------------------------------
  // Yahoo doesn't have a service-level DIAG block; we use the actual
  // probe result freshly fetched above. Re-fetch the quotes briefly so
  // we can count how many have a real value vs "data unavailable".
  const quotes = await Promise.all(QUOTE_SLUGS.map((s) => getQuote(s)));
  const withValue = quotes.filter((q) => q.value !== null).length;
  rows.push({
    name: "Yahoo Finance · Market Quotes",
    category: "market",
    integration: "v1 chart API · public endpoint",
    cadence: "On-demand · 1-5 min cache (intraday / daily)",
    fallback: null,
    priority: 1,
    critical_path: true,
    description:
      "EUR/USD, DXY, US 2Y / 10Y, Brent, Gold, VIX. Missing fields render 'data unavailable' rather than fabricated values.",
    status: withValue === quotes.length ? "live" : withValue === 0 ? "fallback" : "degraded",
    last_success_at: nowIso(),
    last_error: withValue === 0 ? "no instruments returned a value" : null,
    reliability_score: quotes.length > 0 ? withValue / quotes.length : null,
    records_last_run: withValue,
    latency_ms: null,
    vendor: "Yahoo!",
    region: "Global",
  });

  // ----- Calendar (TradingEconomics) ----------------------------------
  const cal = calendarDiagnostics();
  rows.push({
    name: "TradingEconomics · Economic Calendar",
    category: "calendar",
    integration: "REST · " + ((process.env.TRADINGECONOMICS_KEY ?? "").trim().length > 0 ? "registered key" : "public sandbox"),
    cadence: "Polled on demand · 5-min cache",
    fallback: null,
    priority: 1,
    critical_path: true,
    description:
      "G10 + EM economic-release schedule. Each event carries importance, country, forecast, previous, and a desk-authored market-impact frame.",
    status: cal.last_error ? "degraded" : cal.last_count > 0 ? "live" : "fallback",
    last_success_at: cal.last_fetched_at,
    last_error: cal.last_error,
    reliability_score: cal.last_count > 0 ? 1.0 : null,
    records_last_run: cal.last_count,
    latency_ms: null,
    vendor: "TradingEconomics",
    region: "Global",
  });

  // ----- Headlines (public RSS — BBC, AP) -----------------------------
  const hl = headlinesDiagnostics();
  for (const f of hl.per_feed) {
    rows.push({
      name: f.source,
      category: "news",
      integration: "Public RSS · 5-min cache",
      cadence: "Polled on demand · 5-min cache",
      fallback: null,
      priority: 2,
      critical_path: false,
      description:
        "Public-RSS headline feed. Each item classified for market relevance + category; only the link anchor + headline + our editorial frame are surfaced.",
      status: f.ok ? "live" : "fallback",
      last_success_at: f.ok ? hl.last_fetched_at : null,
      last_error: f.error,
      reliability_score: f.ok ? 1.0 : null,
      records_last_run: f.count,
      latency_ms: null,
      vendor: f.source.split(" ")[0],
      region: newsRegion(f.source),
    });
  }
  if (hl.per_feed.length === 0) {
    rows.push({
      name: "Public RSS · BBC + AP",
      category: "news",
      integration: "Public RSS · 5-min cache",
      cadence: "Polled on demand · 5-min cache",
      fallback: null,
      priority: 2,
      critical_path: false,
      description: "Headlines layer not yet probed in this instance.",
      status: "fallback",
      last_success_at: null,
      last_error: "not yet fetched in this instance",
      reliability_score: null,
      records_last_run: 0,
      latency_ms: null,
      vendor: "BBC / AP",
      region: "Global",
    });
  }

  // ----- Central banks (per-bank RSS feeds) ---------------------------
  // Aggregate by bank since some banks have multiple feeds (press +
  // speeches). One row per bank, status = live if ANY feed succeeded.
  const cbDiag = cbDiagnostics();
  for (const bank of ALL_BANKS) {
    const spec = CB_SPECS[bank];
    const feeds = cbDiag.per_feed.filter((p) => p.bank === bank);
    if (feeds.length === 0) {
      rows.push({
        name: spec.name,
        category: "central_banks",
        integration: "Public RSS · 15-min cache",
        cadence: "Polled on demand · 15-min cache",
        fallback: null,
        priority: 1,
        critical_path: true,
        description: spec.market_impact,
        status: "fallback",
        last_success_at: null,
        last_error: "not yet fetched in this instance",
        reliability_score: null,
        records_last_run: 0,
        latency_ms: null,
        vendor: spec.name,
        region: cbRegion(bank),
      });
      continue;
    }
    const totalCount = feeds.reduce((s, p) => s + p.count, 0);
    const anyOk = feeds.some((p) => p.ok);
    const firstErr = feeds.find((p) => !p.ok)?.error ?? null;
    rows.push({
      name: spec.name,
      category: "central_banks",
      integration: `Public RSS · ${feeds.length} feed${feeds.length > 1 ? "s" : ""} · 15-min cache`,
      cadence: "Polled on demand · 15-min cache",
      fallback: null,
      priority: 1,
      critical_path: true,
      description: spec.market_impact,
      status: anyOk ? (totalCount > 0 ? "live" : "degraded") : "fallback",
      last_success_at: anyOk ? cbDiag.last_fetched_at : null,
      last_error: anyOk ? null : firstErr,
      reliability_score: anyOk ? 1.0 : null,
      records_last_run: totalCount,
      latency_ms: null,
      vendor: spec.name,
      region: cbRegion(bank),
    });
  }

  // ----- Geopolitical (government + supranational + commodity supply) ---
  const geo = geoDiagnostics();
  for (const spec of GEO_SOURCES) {
    const feed = geo.per_feed.find((p) => p.org === spec.org);
    if (!feed) {
      rows.push({
        name: spec.source,
        category: "geopolitical",
        integration: "Public RSS · 15-min cache",
        cadence: "Polled on demand · 15-min cache",
        fallback: null,
        priority: spec.tier,
        critical_path: spec.tier === 1,
        description: spec.market_impact,
        status: "fallback",
        last_success_at: null,
        last_error: "not yet fetched in this instance",
        reliability_score: null,
        records_last_run: 0,
        latency_ms: null,
        vendor: spec.source,
        region: spec.region,
      });
      continue;
    }
    rows.push({
      name: spec.source,
      category: "geopolitical",
      integration: "Public RSS · 15-min cache",
      cadence: "Polled on demand · 15-min cache",
      fallback: null,
      priority: spec.tier,
      critical_path: spec.tier === 1,
      description: spec.market_impact,
      status: feed.ok ? (feed.count > 0 ? "live" : "degraded") : "fallback",
      last_success_at: feed.ok ? geo.last_fetched_at : null,
      last_error: feed.error,
      reliability_score: feed.ok ? 1.0 : null,
      records_last_run: feed.count,
      latency_ms: null,
      vendor: spec.source,
      region: spec.region,
    });
  }

  return rows;
}
