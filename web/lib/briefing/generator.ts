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
import { synthesise, narrativeDiagnostics } from "@/lib/narrative/service";
import type { NarrativeOutput } from "@/lib/narrative/types";

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

/**
 * Resolve a narrative field, falling back to a template when the LLM
 * either declined to write the section ("source data insufficient") or
 * was unavailable entirely (null narrative). The narrative never
 * extends the template; it replaces it field-by-field when present.
 */
function orTemplate(llmValue: string | undefined, templateValue: string): string {
  if (!llmValue) return templateValue;
  const t = llmValue.trim();
  if (t.length === 0) return templateValue;
  if (t.toLowerCase() === "source data insufficient") return templateValue;
  return llmValue;
}

async function buildIntelligence(
  byInstrument: Map<string, MarketQuote>,
  calendarEvents: CalendarEvent[],
  headlines: Headline[],
  cbEvents: CBEvent[],
  narrative: NarrativeOutput | null,
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

  // Template content — used when narrative is null OR when a specific
  // narrative field came back as "source data insufficient". Each field
  // is wrapped in orTemplate() so the LLM output can replace it piece
  // by piece without forcing an all-or-nothing override.
  const tmplStrategistBody =
    "This briefing structure renders today's framework with live reference " +
    "levels from connected market-data sources. Strategist commentary " +
    "lands when narrative synthesis is wired or when a human strategist " +
    "publishes the morning view.";
  const tmplOpening =
    "The morning brief surfaces the desk's structural monitoring set: " +
    "FX, rates, energy, vol. Directional commentary is intentionally " +
    "absent until strategist input is available.";
  const tmplWhatsMoving =
    `EUR/USD reference: ${fmtSource(eurusd)}. ` +
    `DXY reference: ${fmtSource(dxy)}. ` +
    "Quoted levels are pulled from Yahoo Finance and reflect the most " +
    "recent print available to the free feed.";
  const tmplRatesView =
    `US 10Y yield reference: ${fmtSource(us10y)}. ` +
    "Front-end (US 2Y) coverage lands once the FRED adapter is wired; " +
    "until then the front-end reads 'data unavailable'.";
  const tmplCrossAsset =
    `Brent reference: ${fmtSource(brent)}. ` +
    "Cross-asset linkage framework is structural: rates anchor risk " +
    "pricing, FX feeds equity sector rotation, commodities anchor the " +
    "geopolitical premium.";
  const tmplWhatChangedSummary =
    "Recent platform deltas: live market-data layer wired (B-D.1); " +
    "calendar + headlines + CB activity wired (B-D.2.1–2.3); narrative " +
    "synthesis layer wired (B-D.2.4). Daily price-action deltas resume " +
    "when comparison snapshots from the previous session are in cache.";
  const tmplKeyTakeaways = [
    { rank: 1, text: "Live market levels are populated from Yahoo Finance where available; fields without a source read 'data unavailable' rather than fabricated values." },
    { rank: 2, text: "Calendar, headlines, and central-bank activity are now sourced from TradingEconomics, public RSS, and each bank's own feed respectively." },
    { rank: 3, text: "Narrative synthesis uses Claude Sonnet 4.6 over the assembled context; output cited against context ids, validated before render, falls back to template on failure." },
  ];

  return {
    strategist_view: {
      headline: orTemplate(narrative?.strategist_view.headline, "Live market reference"),
      body: orTemplate(narrative?.strategist_view.body, tmplStrategistBody),
    },
    macro_overview: {
      opening: orTemplate(narrative?.macro_overview.opening, tmplOpening),
      whats_moving: orTemplate(narrative?.macro_overview.whats_moving, tmplWhatsMoving),
      rates_view: orTemplate(narrative?.macro_overview.rates_view, tmplRatesView),
      cross_asset_thesis: orTemplate(narrative?.macro_overview.cross_asset_thesis, tmplCrossAsset),
    },
    what_changed: {
      summary: orTemplate(narrative?.what_changed.summary, tmplWhatChangedSummary),
      deltas: narrative?.what_changed.deltas && narrative.what_changed.deltas.length > 0
        ? narrative.what_changed.deltas
        : [],
    },
    key_takeaways: narrative?.key_takeaways && narrative.key_takeaways.length > 0
      ? narrative.key_takeaways
      : tmplKeyTakeaways,
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

  // Stage 1 — fetch the structured data first. The narrative service
  // depends on this output; we can't kick it off until the data is in.
  const [quotes, calendarEvents, headlines, cbEvents] = await Promise.all([
    Promise.all(slugs.map((s) => getQuote(s))),
    getCalendarEvents(),
    getBriefingHeadlines(10),
    getBriefingCBEvents(8),
  ]);

  const byInstrument = new Map<string, MarketQuote>();
  for (const q of quotes) byInstrument.set(q.instrument, q);

  // Stage 2 — synthesise the institutional narrative from the structured
  // context. Returns null when demo-mode is on, when no API key is
  // configured, or when the LLM call / validation fails. In every
  // null case the buildIntelligence step falls back to its existing
  // template content for the affected fields.
  const narrative = await synthesise({
    date_iso: dateIso,
    quotes,
    calendar: calendarEvents,
    headlines,
    cb_events: cbEvents,
  });

  const intelligence = await buildIntelligence(byInstrument, calendarEvents, headlines, cbEvents, narrative);

  const now = new Date().toISOString();
  const longDate = formatLongDate(dateIso);

  // BriefingRead-level template fields. Each is wrapped in orTemplate()
  // so the LLM narrative can replace any field piece-by-piece.
  const tmplHeadline =
    "Live market reference levels via connected sources. Narrative " +
    "synthesis from Anthropic Claude over the assembled context.";
  const tmplExecSummary =
    "Pre-market institutional brief.\n\n" +
    "Live market levels pulled from Yahoo Finance (15-minute delayed for " +
    "exchange-traded; effectively realtime for FX). Today's economic " +
    `calendar sourced from TradingEconomics — ${selectBriefingEvents(calendarEvents).length} ` +
    "desk-relevant releases ahead. Headlines + central-bank activity " +
    "pulled from each source's public RSS feed. Narrative synthesis " +
    "via Claude Sonnet 4.6 when ANTHROPIC_API_KEY is configured; " +
    "template content otherwise.";
  const tmplFx =
    `EUR/USD reference: ${fmtSource(byInstrument.get("EUR/USD"))}. ` +
    `DXY reference: ${fmtSource(byInstrument.get("DXY"))}.`;
  const tmplRates =
    `US 10Y yield reference: ${fmtSource(byInstrument.get("US 10Y"))}. ` +
    `US 2Y yield reference: ${fmtSource(byInstrument.get("US 2Y"))}.`;
  const tmplEquities =
    `VIX reference: ${fmtSource(byInstrument.get("VIX"))}. ` +
    "Equity index quote coverage (S&P, Stoxx, Nikkei) lands when the " +
    "instrument registry expands.";
  const tmplCommodities =
    `Brent reference: ${fmtSource(byInstrument.get("Brent"))}. ` +
    `Gold reference: ${fmtSource(byInstrument.get("Gold"))}.`;

  // Narrative diagnostic for the provenance footer.
  const narrDiag = narrativeDiagnostics();
  const narrativeSource = !narrDiag.key_configured
    ? "Anthropic Claude — ANTHROPIC_API_KEY not configured (using template fallback)"
    : narrDiag.last_result === "ok"
      ? `Anthropic Claude (${narrDiag.last_model}, ${narrDiag.last_input_tokens}→${narrDiag.last_output_tokens} tokens, ${narrDiag.last_latency_ms}ms)`
      : narrDiag.last_result === "cache"
        ? `Anthropic Claude (${narrDiag.last_model}, cached)`
        : narrDiag.last_result === "validate-fail"
          ? `Anthropic Claude — output failed validation (${narrDiag.last_error}); using template fallback`
          : narrDiag.last_result === "api-fail"
            ? `Anthropic Claude — API call failed (${narrDiag.last_error}); using template fallback`
            : "Anthropic Claude — not yet called";

  return {
    id: `auto-${dateIso}`,
    briefing_date: dateIso,
    briefing_type: "morning_fx_macro",
    status: "published",
    title: `Morning FX & Macro Review — ${longDate}`,
    headline: orTemplate(narrative?.strategist_view.headline, tmplHeadline),
    executive_summary: orTemplate(narrative?.executive_summary, tmplExecSummary),
    fx_commentary: orTemplate(narrative?.fx_commentary, tmplFx),
    rates_commentary: orTemplate(narrative?.rates_commentary, tmplRates),
    equities_commentary: orTemplate(narrative?.equities_commentary, tmplEquities),
    commodities_commentary: orTemplate(narrative?.commodities_commentary, tmplCommodities),
    risk_tone: (narrative?.risk_tone ?? "neutral") as RiskTone,
    key_events: selectBriefingEvents(calendarEvents),
    risk_themes: [],
    market_snapshot: buildSnapshot(byInstrument),
    intelligence: {
      ...intelligence,
      provenance: [
        ...intelligence.provenance,
        {
          section: "narrative",
          sources: [narrativeSource],
          as_of: narrDiag.last_call_at ? narrDiag.last_call_at.slice(11, 16) + " UTC" : "—",
        },
      ],
    },
    generation_source: narrative ? "anthropic" : "mock",
    generator_version: GENERATOR_VERSION,
    model_name: narrative ? narrDiag.last_model : null,
    generation_metadata: {
      generator: "vercel-native",
      market_data_sources: ["Yahoo Finance"],
      calendar_source: "TradingEconomics",
      headlines_sources: ["BBC", "AP"],
      cb_sources: ["Federal Reserve", "ECB", "BoE", "BoJ", "SNB"],
      narrative_model: narrative ? narrDiag.last_model : null,
      narrative_result: narrDiag.last_result,
    },
    desk: "Macro & FX",
    author: "Makor Securities · Macro & FX Desk",
    published_at: now,
    created_at: now,
    updated_at: now,
    data_provenance: narrative ? "live" : "partial",
    demo_disclosure: narrative
      ? null
      : "Live market data, calendar, headlines, and central-bank activity all sourced from connected feeds. Narrative synthesis is template content until ANTHROPIC_API_KEY is configured on the server. Per-section source attribution is shown in the Provenance footer of each block.",
  };
}
