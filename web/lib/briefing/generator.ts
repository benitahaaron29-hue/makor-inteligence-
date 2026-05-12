/**
 * Vercel-native briefing generator.
 *
 * Composes a complete BriefingRead on demand, with two distinct kinds of
 * content:
 *
 *   1. MARKET DATA  — real quotes from the market-data service
 *                     (Yahoo Finance v1; FRED/Stooq/ECB land in B-D.2).
 *                     Where a quote is unavailable, the renderer shows
 *                     "data unavailable" — nothing is fabricated.
 *
 *   2. NARRATIVE    — neutral institutional template content authored
 *                     here from scratch. The template describes the
 *                     desk's monitoring framework, NOT today's specific
 *                     market direction. It will be replaced by either
 *                     human strategist input or a Phase-2 AI synthesis
 *                     layer; until then it is honestly flagged
 *                     `data_provenance: "partial"` and the briefing
 *                     carries an explicit demo_disclosure line.
 *
 * No FastAPI backend is required. The generator runs entirely inside the
 * Next.js serverless function on Vercel — same path as the rest of the
 * market-data layer.
 */

import type {
  BriefingRead,
  Intelligence,
  InstrumentWatch,
  Chart,
  CentralBankItem,
  MarketSnapshot,
  RiskTone,
  KeyEvent,
} from "@/lib/types/briefing";
import type { MarketQuote } from "@/lib/market/types";
import { getQuote } from "@/lib/market/service";
import { REGISTRY } from "@/lib/market/registry";
import { yahooFetchSeries, type TimeSeries } from "@/lib/market/adapters/yahoo";
import { isDemoMode } from "@/lib/api/demo";
import { getCalendarEvents, calendarDiagnostics } from "@/lib/calendar/service";
import { meetsDeskFilter } from "@/lib/calendar/classifier";
import type { CalendarEvent } from "@/lib/calendar/types";
import { getBriefingHeadlines, headlinesDiagnostics } from "@/lib/headlines/service";
import type { Headline } from "@/lib/headlines/types";
import { getBriefingCBEvents, cbDiagnostics } from "@/lib/central-banks/service";
import { CB_SPECS, ALL_BANKS } from "@/lib/central-banks/feeds";
import type { CBEvent } from "@/lib/central-banks/types";

// ============================================================================
// FORMATTERS — render real quotes for narrative paragraphs.
// ============================================================================

function fmtValue(q: MarketQuote | undefined): string {
  if (!q || q.value === null) return "—";
  if (q.unit === "yield" || q.unit === "pct") return `${q.value.toFixed(3)}%`;
  if (q.unit === "price" && /\//.test(q.instrument)) return q.value.toFixed(4);
  if (q.unit === "index") return q.value.toFixed(2);
  return q.value.toFixed(2);
}

function fmtSource(q: MarketQuote | undefined): string {
  if (!q || q.value === null) return "data unavailable";
  const tail = q.delay_minutes != null ? `, ~${q.delay_minutes}m delayed` : "";
  return `${fmtValue(q)} (${q.source}${tail})`;
}

function hh_mm(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")} GMT`;
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${d} ${months[m - 1]} ${y}`;
}

// ============================================================================
// CALENDAR → KEY EVENT MAPPER
//
// Translates a CalendarEvent (canonical TradingEconomics-derived shape)
// into the briefing's existing KeyEvent shape so the reader can render
// it with no UI changes. The market_impact frame (where present) flows
// into `desk_focus`, which the existing renderer already shows.
// ============================================================================

function calendarToKeyEvent(e: CalendarEvent): KeyEvent {
  return {
    time_utc: e.time,
    region: e.country,
    event: e.event,
    importance: e.importance,
    forecast: e.forecast,
    previous: e.previous,
    speaker: null,
    topic: null,
    category: e.category,
    sensitivity: e.importance === "critical" ? "desk_critical" : e.importance,
    pairs_affected: null,
    vol_impact: null,
    desk_focus: e.market_impact,
  };
}

/**
 * Filter the full calendar window to what belongs at the top of the
 * briefing: critical + high importance, capped at 12 to avoid bloat,
 * already chronologically sorted by the service.
 */
function selectBriefingEvents(events: CalendarEvent[]): KeyEvent[] {
  return events.filter(meetsDeskFilter).slice(0, 12).map(calendarToKeyEvent);
}

// ============================================================================
// CHART BUILDER — turn one TimeSeries into a Chart record.
// ============================================================================

function chartFromSeries(rank: number, instrument: string, ts: TimeSeries): Chart {
  const series = ts.points.map((p) => p.v);
  const xStart = ts.points[0]?.t;
  const xEnd = ts.points[ts.points.length - 1]?.t;
  return {
    rank,
    title: `${instrument} · Today`,
    subtitle: `${Math.round(ts.interval_seconds / 60)}-min · last session`,
    kind: "line",
    series,
    baseline: ts.previous_close,
    y_min_label: Math.min(...series).toFixed(4).replace(/\.?0+$/, ""),
    y_max_label: Math.max(...series).toFixed(4).replace(/\.?0+$/, ""),
    x_start_label: xStart ? hh_mm(xStart) : null,
    x_end_label: xEnd ? hh_mm(xEnd) : null,
    note: "Today's intraday move. Dashed line: previous session close.",
    data_source: `${ts.source} · ${Math.round(ts.interval_seconds / 60)}-min bars, ~15m delayed`,
  };
}

async function buildCharts(): Promise<Chart[]> {
  // Three highest-signal instruments for the morning desk.
  const chartTargets: Array<{ instrument: string; slug: string }> = [
    { instrument: "EUR/USD", slug: "eurusd" },
    { instrument: "US 10Y",  slug: "us10y" },
    { instrument: "Brent",   slug: "brent" },
  ];

  const charts: Chart[] = [];
  let rank = 1;

  for (const target of chartTargets) {
    const spec = REGISTRY[target.slug];
    if (!spec) continue;
    const link = spec.chain.find((l) => l.adapter === "yahoo");
    if (!link) continue;
    try {
      const ts = await yahooFetchSeries(link.symbol);
      if (ts.points.length >= 2) {
        charts.push(chartFromSeries(rank++, target.instrument, ts));
      }
    } catch {
      // Skip the chart silently — never fabricate a series. The ChartCard
      // will simply not appear in the grid. (B-D.3 will add a card-level
      // "data unavailable" placeholder so the grid layout stays stable.)
    }
  }

  return charts;
}

// ============================================================================
// MARKET SNAPSHOT — populate only keys whose quotes returned a real value.
// ============================================================================

function buildSnapshot(byInstrument: Map<string, MarketQuote>): MarketSnapshot {
  const put = (
    target: Record<string, number>,
    instrument: string,
    label: string,
  ) => {
    const q = byInstrument.get(instrument);
    if (q && q.value !== null) target[label] = q.value;
  };

  const fx: Record<string, number> = {};
  const rates: Record<string, number> = {};
  const equities: Record<string, number> = {};
  const commodities: Record<string, number> = {};

  put(fx, "EUR/USD", "EUR/USD");
  put(fx, "DXY", "DXY");
  put(rates, "US 2Y", "US 2Y");
  put(rates, "US 10Y", "US 10Y");
  put(equities, "VIX", "VIX");
  put(commodities, "Brent", "Brent");
  put(commodities, "Gold", "Gold");

  return {
    fx,
    rates,
    equities,
    commodities,
    as_of: new Date().toISOString(),
  };
}

// ============================================================================
// INSTRUMENTS TO WATCH — each card references its real current level.
// ============================================================================

function watchCard(
  rank: number,
  instrument: string,
  region: string,
  q: MarketQuote | undefined,
  context: string,
  desk_focus: string,
  catalyst: string,
): InstrumentWatch {
  const level = q && q.value !== null ? `currently at ${fmtSource(q)}` : "level unavailable from connected sources";
  return {
    rank,
    instrument,
    region,
    why_today: `${instrument} ${level}. ${context}`,
    catalyst,
    desk_focus,
  };
}

function buildInstrumentsToWatch(byInstrument: Map<string, MarketQuote>): InstrumentWatch[] {
  return [
    watchCard(
      1,
      "EUR/USD",
      "G10 FX",
      byInstrument.get("EUR/USD"),
      "Primary G10 expression of cross-Atlantic monetary-policy divergence.",
      "Watch reaction windows around US data releases and ECB / Fed speakers. Range extremes mark the levels institutional desks defend.",
      "US economic releases · ECB / Fed scheduled commentary",
    ),
    watchCard(
      2,
      "US 10Y",
      "US rates",
      byInstrument.get("US 10Y"),
      "The duration anchor for cross-asset risk pricing.",
      "Curve shape relative to the front end is the variable. Auction concession and Treasury supply calendar shape the path.",
      "Treasury auction calendar · Fed commentary",
    ),
    watchCard(
      3,
      "DXY",
      "FX index",
      byInstrument.get("DXY"),
      "Aggregate dollar strength against the G10 funder basket (Yahoo's DXY approximation; ICE methodology requires a paid feed).",
      "Trades off the same drivers as EUR/USD but smooths idiosyncratic single-pair noise.",
      "US data window · G10 central-bank speakers",
    ),
    watchCard(
      4,
      "Brent",
      "Energy",
      byInstrument.get("Brent"),
      "Geopolitical risk-premium proxy and primary input to commodity-bloc FX.",
      "Front-month curve shape (backwardation / contango) carries more signal than spot for the desk. EIA inventories and OPEC commentary the structural anchors.",
      "EIA inventory releases · OPEC commentary · MENA headline flow",
    ),
    watchCard(
      5,
      "VIX",
      "Equity vol",
      byInstrument.get("VIX"),
      "Forward-looking S&P 500 implied volatility — institutional risk gauge.",
      "Mean-reversion versus realised vol is the main signal. Macro releases (CPI, NFP, FOMC) are the structural catalyst windows.",
      "US macro releases · Fed cycle",
    ),
  ];
}

// ============================================================================
// CENTRAL BANK WATCH — qualitative scaffold; no fabricated pricing.
// ============================================================================

/**
 * Build the structural CentralBankItem cards from the CB_SPECS registry
 * + recent RSS-derived activity. Bias and the live "why this matters
 * today" frame come from the per-bank spec; pricing fields stay tagged
 * "Source connection pending" until CME FedWatch / OIS adapters land.
 *
 * recent_speakers is populated from cb_events when the bank has at
 * least one speech in the 14-day window — neutral, no fabrication.
 */
function buildCentralBanks(cbEvents: CBEvent[]): CentralBankItem[] {
  return ALL_BANKS.map((bank) => {
    const spec = CB_SPECS[bank];
    const bankEvents = cbEvents.filter((e) => e.bank === bank);
    const recentSpeakers = Array.from(
      new Set(
        bankEvents
          .filter((e) => e.kind === "speech" || e.kind === "press-conf" || e.kind === "testimony")
          .map((e) => e.speaker)
          .filter((s): s is string => typeof s === "string" && s.length > 0),
      ),
    ).slice(0, 5);

    return {
      bank: spec.name,
      short: spec.bank,
      last_meeting: "See official calendar (link in source footer)",
      next_meeting_date: null,
      days_to_next: null,
      market_pricing: "Live pricing pending CME FedWatch / OIS adapters",
      bias: spec.bias,
      upcoming_speakers: recentSpeakers,
      policy_stance: spec.market_impact,
      inflation_sensitivity: null,
      growth_sensitivity: null,
      qt_stance: null,
      pricing_change_1w: "Source connection pending",
      hawkish_shift: null,
      triggers: [],
    };
  });
}

// ============================================================================
// INTELLIGENCE — neutral template narrative + the live structural blocks.
// ============================================================================

async function buildIntelligence(
  byInstrument: Map<string, MarketQuote>,
  calendarEvents: CalendarEvent[],
  headlines: Headline[],
  cbEvents: CBEvent[],
): Promise<Intelligence> {
  const charts = await buildCharts();

  const eurusd = byInstrument.get("EUR/USD");
  const us10y = byInstrument.get("US 10Y");
  const dxy = byInstrument.get("DXY");
  const brent = byInstrument.get("Brent");

  // Calendar-derived structural signal — count critical/high events today
  // so the "what_changed" + "rates_view" copy can reference real load.
  const deskEvents = calendarEvents.filter(meetsDeskFilter);
  const calDiag = calendarDiagnostics();
  const calendarSource = calDiag.last_error
    ? `TradingEconomics — source unavailable (${calDiag.last_error})`
    : `TradingEconomics (${calDiag.last_count} events fetched, ${deskEvents.length} desk-relevant)`;

  // Headlines provenance — surface per-feed success/failure to the
  // provenance footer rather than silently hiding which sources gave us
  // today's content.
  const hlDiag = headlinesDiagnostics();
  const hlSources = hlDiag.per_feed.length === 0
    ? "Public RSS feeds — not yet fetched"
    : hlDiag.per_feed
        .map((p) => p.ok ? `${p.source} (${p.count})` : `${p.source} — unavailable`)
        .join(" · ");

  // Central-bank provenance — per-bank success/failure folded into a
  // single comma-separated string. Each bank's official calendar URL is
  // surfaced in the renderer via the CB cards' source footer.
  const cbDiag = cbDiagnostics();
  const cbBankStatus = new Map<string, { ok: number; failed: number; count: number }>();
  for (const p of cbDiag.per_feed) {
    const s = cbBankStatus.get(p.bank) ?? { ok: 0, failed: 0, count: 0 };
    if (p.ok) { s.ok += 1; s.count += p.count; } else { s.failed += 1; }
    cbBankStatus.set(p.bank, s);
  }
  const cbSources = cbBankStatus.size === 0
    ? "Public RSS feeds — not yet fetched"
    : Array.from(cbBankStatus.entries())
        .map(([bank, s]) => s.ok > 0 ? `${bank} (${s.count})` : `${bank} — unavailable`)
        .join(" · ");

  return {
    strategist_view: {
      headline: "Live market reference",
      body:
        "This briefing structure renders today's framework with live reference " +
        "levels from connected market-data sources. Strategist commentary and " +
        "directional framing land when human input or a Phase-2 AI synthesis " +
        "layer is wired. Until then, each section either shows real data with " +
        "its source attribution or reads as institutional template content.",
    },
    macro_overview: {
      opening:
        "The morning brief surfaces the desk's structural monitoring set: " +
        "FX, rates, energy, vol. Directional commentary is intentionally " +
        "absent until strategist input is available.",
      whats_moving:
        `EUR/USD reference: ${fmtSource(eurusd)}. ` +
        `DXY reference: ${fmtSource(dxy)}. ` +
        "Quoted levels are pulled from Yahoo Finance and reflect the most " +
        "recent print available to the free feed.",
      rates_view:
        `US 10Y yield reference: ${fmtSource(us10y)}. ` +
        "Front-end (US 2Y) coverage lands once the FRED adapter is wired " +
        "in B-D.2 — until then the front-end card reads 'data unavailable'.",
      cross_asset_thesis:
        `Brent reference: ${fmtSource(brent)}. ` +
        "Cross-asset linkage framework is structural: rates anchor risk " +
        "pricing, FX feeds equity sector rotation, commodities anchor the " +
        "geopolitical premium. Specific directional theses await strategist " +
        "input.",
    },
    what_changed: {
      summary:
        "Recent platform deltas: live market-data layer wired (B-D.1); " +
        "silent demo-mock fallback removed; DataPoint provenance plumbing " +
        "pending (B-D.3). Daily price-action deltas resume when comparison " +
        "snapshots from the previous session are in cache.",
      deltas: [],
    },
    key_takeaways: [
      { rank: 1, text: "Live market levels are populated from Yahoo Finance where available; fields without a source read 'data unavailable' rather than fabricated values." },
      { rank: 2, text: "Strategist commentary is template content until human input or AI synthesis is wired." },
      { rank: 3, text: "Calendar, central-bank pricing, positioning, and pair-level commentary require dedicated source adapters (B-D.2 / B-D.5)." },
    ],
    desk_priorities: [],
    risk_scenarios: [],
    trade_ideas: [],
    instruments_to_watch: buildInstrumentsToWatch(byInstrument),
    central_banks: buildCentralBanks(cbEvents),
    pair_commentary: [],
    positioning: [],
    session_breakdown: {
      asia: "Asia-session detail requires a live news adapter (Reuters/Bloomberg) and is not yet wired.",
      europe: "European-session detail requires a live news adapter and is not yet wired.",
      us: "US-session detail requires a live news adapter and is not yet wired.",
    },
    cross_asset: [],
    pull_stats: [],
    risk_warnings: [],
    consensus_calls: [],
    geopolitical: null,
    headlines,
    cb_events: cbEvents,
    provenance: [
      { section: "regime", sources: ["Yahoo Finance (Vercel-native adapter)"], as_of: new Date().toISOString().slice(11, 16) + " UTC" },
      { section: "fx", sources: ["Yahoo Finance"], as_of: new Date().toISOString().slice(11, 16) + " UTC" },
      { section: "calendar", sources: [calendarSource], as_of: calDiag.last_fetched_at ? calDiag.last_fetched_at.slice(11, 16) + " UTC" : "—" },
      { section: "central-banks", sources: [cbSources], as_of: cbDiag.last_fetched_at ? cbDiag.last_fetched_at.slice(11, 16) + " UTC" : "—" },
      { section: "trades", sources: ["Template content + Yahoo Finance reference levels"], as_of: new Date().toISOString().slice(11, 16) + " UTC" },
      { section: "geopolitical", sources: [hlSources], as_of: hlDiag.last_fetched_at ? hlDiag.last_fetched_at.slice(11, 16) + " UTC" : "—" },
    ],
    charts,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

const GENERATOR_VERSION = "auto-vercel-2026.05";

export async function generateBriefing(dateIso: string): Promise<BriefingRead> {
  if (isDemoMode()) {
    // Demo mode is handled at the call-site (briefingsApi serves the bundled
    // mock instead). This guard is defence-in-depth.
    throw new Error("generateBriefing: refusing to run in demo mode");
  }

  // Validate the date format early so callers can't pass bad input through.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error(`generateBriefing: invalid date "${dateIso}"`);
  }

  const slugs = ["eurusd", "dxy", "us2y", "us10y", "brent", "gold", "vix"];

  // Market quotes + calendar + headlines + central-bank activity fetched
  // in parallel — four independent network workloads, the briefing waits
  // on the slowest.
  const [quotes, calendarEvents, headlines, cbEvents] = await Promise.all([
    Promise.all(slugs.map((s) => getQuote(s))),
    getCalendarEvents(),
    getBriefingHeadlines(10),
    getBriefingCBEvents(8),
  ]);

  const byInstrument = new Map<string, MarketQuote>();
  for (const q of quotes) byInstrument.set(q.instrument, q);

  const intelligence = await buildIntelligence(byInstrument, calendarEvents, headlines, cbEvents);

  const now = new Date().toISOString();
  const longDate = formatLongDate(dateIso);

  return {
    id: `auto-${dateIso}`,
    briefing_date: dateIso,
    briefing_type: "morning_fx_macro",
    status: "published",
    title: `Morning FX & Macro Review — ${longDate}`,
    headline:
      "Live market reference levels via Yahoo Finance. Narrative sections " +
      "are institutional template until strategist input is wired.",
    executive_summary:
      "Pre-market institutional brief.\n\n" +
      "Live market levels pulled from Yahoo Finance (15-minute delayed for " +
      "exchange-traded; effectively realtime for FX). Today's economic " +
      `calendar sourced from TradingEconomics — ${selectBriefingEvents(calendarEvents).length} ` +
      "desk-relevant releases ahead, each tagged with a market-impact frame " +
      "where the desk has a template. Strategist narrative, central-bank " +
      "pricing, positioning (CFTC), and geopolitical headline flow are " +
      "template scaffolding until their dedicated source adapters land " +
      "(B-D.2 → B-D.5).",
    fx_commentary:
      `EUR/USD reference: ${fmtSource(byInstrument.get("EUR/USD"))}. ` +
      `DXY reference: ${fmtSource(byInstrument.get("DXY"))}. ` +
      "Specific pair-level commentary requires per-pair vol grids and " +
      "level analysis — that section ships in B-D.3.",
    rates_commentary:
      `US 10Y yield reference: ${fmtSource(byInstrument.get("US 10Y"))}. ` +
      `US 2Y yield reference: ${fmtSource(byInstrument.get("US 2Y"))}.`,
    equities_commentary:
      `VIX reference: ${fmtSource(byInstrument.get("VIX"))}. ` +
      "Equity index quote coverage (S&P, Stoxx, Nikkei) lands in B-D.2 " +
      "when the registry expands.",
    commodities_commentary:
      `Brent reference: ${fmtSource(byInstrument.get("Brent"))}. ` +
      `Gold reference: ${fmtSource(byInstrument.get("Gold"))}.`,
    risk_tone: "neutral" as RiskTone,
    key_events: selectBriefingEvents(calendarEvents),
    risk_themes: [],
    market_snapshot: buildSnapshot(byInstrument),
    intelligence,
    generation_source: "mock",
    generator_version: GENERATOR_VERSION,
    model_name: null,
    generation_metadata: {
      generator: "vercel-native",
      market_data_sources: ["Yahoo Finance"],
      pending_sources: ["FRED", "Stooq", "ECB SDW", "TradingEconomics", "CME FedWatch", "CFTC COT"],
    },
    desk: "Macro & FX",
    author: "Makor Securities · Macro & FX Desk",
    published_at: now,
    created_at: now,
    updated_at: now,
    data_provenance: "partial",
    demo_disclosure:
      "Live market reference levels via Yahoo Finance (15min delayed for " +
      "exchange-traded; realtime for FX). Narrative sections are institutional " +
      "template content until human strategist input or Phase-2 AI synthesis " +
      "is wired. Per-section source attribution is shown in the Provenance " +
      "footer of each block.",
  };
}
