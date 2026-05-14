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
import { getBriefingGeoEvents, geoDiagnostics } from "@/lib/geopol/service";
import type { GeoEvent } from "@/lib/geopol/types";
import { synthesise, peekCachedNarrative, narrativeDiagnostics } from "@/lib/narrative/service";
import { isLLMFieldUsable } from "@/lib/narrative/usable";
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
 * was unavailable entirely (null narrative). Uses the shared
 * `isLLMFieldUsable` helper so the generator and the narrative
 * service's field-source diagnostic agree on what counts as "usable".
 *
 * Critically, this matcher tolerates punctuation + hyphenation variants
 * the LLM might emit ("Source data insufficient.", "source-data-insufficient",
 * "Insufficient data") — strict equality on a single literal was the
 * silent leak in the previous iteration.
 */
function orTemplate(llmValue: string | undefined, templateValue: string): string {
  return isLLMFieldUsable(llmValue) ? (llmValue as string) : templateValue;
}

async function buildIntelligence(
  byInstrument: Map<string, MarketQuote>,
  calendarEvents: CalendarEvent[],
  headlines: Headline[],
  cbEvents: CBEvent[],
  geoEvents: GeoEvent[],
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

  // Geopolitical / government source provenance — per-org success /
  // failure folded into a single comma-separated string so the
  // operator can see at a glance which feeds populated today's
  // briefing context.
  const geoDiag = geoDiagnostics();
  const geoSources = geoDiag.per_feed.length === 0
    ? "Public government / supranational RSS feeds — not yet fetched"
    : geoDiag.per_feed
        .map((p) => p.ok ? `${p.source} (${p.count})` : `${p.source} — unavailable`)
        .join(" · ");

  // Template content — used when narrative is null OR when a specific
  // narrative field came back as "source data insufficient". The
  // institutional voice here matters: a templated fallback should still
  // read like a desk note placeholder, never like engineering copy or
  // a development log. Source attribution sits in the provenance footer
  // and the dedicated /sources page; do NOT repeat "(Yahoo Finance, ~15m
  // delayed)" inline — it breaks editorial flow.
  const tmplStrategistBody =
    "Desk view consolidates after the overnight tape settles. The framework " +
    "below frames today's swing variables — what moved, what's priced, what " +
    "the desk watches into the European cash open.";
  const tmplOpening =
    "Overnight session focus: yields, FX-rate divergence, energy supply " +
    "premium, equity-vol regime. Directional bias confirms after the data " +
    "and central-bank flow into the morning print window.";
  const tmplWhatsMoving =
    `Reference levels: EUR/USD ${fmtValue(eurusd)}, DXY ${fmtValue(dxy)}. ` +
    "Overnight cross-asset moves are read against the prior session's close " +
    "and the structural drivers — front-end yields, oil supply premium, " +
    "and the day's catalyst load.";
  const tmplRatesView =
    `US 10Y reference: ${fmtValue(us10y)}. ` +
    "Curve shape carries more cross-asset signal than the level alone: the " +
    "front-end leads USD strength, the back-end anchors growth-sensitive " +
    "equity sectors and duration-sensitive credit.";
  const tmplCrossAsset =
    `Brent reference: ${fmtValue(brent)}. ` +
    "Linkages the desk reads in sequence: yields → USD → EM-FX risk " +
    "premium; oil → commodity-bloc FX + breakevens; geopolitical premium → " +
    "JPY / CHF / gold safe-haven flow.";
  const tmplWhatChangedSummary =
    "Overnight deltas surface as the morning catalyst register populates. " +
    "The desk reads change against the prior session's close — what " +
    "repriced, what escalated, what got missed.";
  const tmplKeyTakeaways = [
    { rank: 1, text: "Cross-asset regime is reading off front-end yields and the bund-Treasury spread; the desk watches for divergence between the FX and rates legs into the cash open." },
    { rank: 2, text: "Geopolitical risk premium remains the structural overlay on Brent and the EM-FX carry complex; sanctions / tariff escalation the cleanest re-pricing trigger." },
    { rank: 3, text: "Central-bank communication into the next print window is the live variable for the front-end of the curve and growth-sensitive equity sectors." },
  ];

  return {
    strategist_view: {
      headline: orTemplate(narrative?.strategist_view.headline, "Pre-open desk view"),
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
      asia: "Asia session reads off CNH / JPY / AUD flow and the Tokyo fix; overnight catalysts surface inline above.",
      europe: "European session reads off bund-Treasury spread, ECB rhetoric, and the LDN cash open tape.",
      us: "US session reads off Treasury front-end + ISM / NFP / CPI prints + Fed speakers into the print window.",
    },
    cross_asset: [],
    pull_stats: [],
    risk_warnings: [],
    consensus_calls: [],
    geopolitical: null,
    headlines,
    cb_events: cbEvents,
    geopol_events: geoEvents,
    // Stab-4.2 editorial cleanup — the "regime" / "fx" / "trades" rows
    // had been carrying inline "Yahoo Finance (Vercel-native adapter)"
    // attributions that broke institutional immersion at the bottom of
    // every section. Per-feed source attribution lives on the dedicated
    // /sources page; the briefing footers now carry only the per-section
    // entries where multi-feed aggregation actually warrants a footer
    // (calendar / central-banks / geopolitical / government).
    provenance: [
      { section: "calendar", sources: [calendarSource], as_of: calDiag.last_fetched_at ? calDiag.last_fetched_at.slice(11, 16) + " UTC" : "—" },
      { section: "central-banks", sources: [cbSources], as_of: cbDiag.last_fetched_at ? cbDiag.last_fetched_at.slice(11, 16) + " UTC" : "—" },
      { section: "geopolitical", sources: [hlSources], as_of: hlDiag.last_fetched_at ? hlDiag.last_fetched_at.slice(11, 16) + " UTC" : "—" },
      { section: "government", sources: [geoSources], as_of: geoDiag.last_fetched_at ? geoDiag.last_fetched_at.slice(11, 16) + " UTC" : "—" },
    ],
    charts,
  };
}

// ============================================================================
// PUBLIC API
// ============================================================================

const GENERATOR_VERSION = "auto-vercel-2026.05";

// Module-level invocation counter. Vercel routes requests to different
// serverless function instances; each instance has its own copy of this
// state. When /api/diag returns generator.call_count: 0, the operator
// knows that THIS specific instance has never run the briefing
// generator — which means the diagnostics for the downstream services
// (narrative, headlines, calendar, CB) will also be empty for this
// instance regardless of how many times other instances ran them.
let GENERATOR_CALL_COUNT = 0;
let GENERATOR_LAST_CALL_AT: string | null = null;
let GENERATOR_LAST_DURATION_MS: number | null = null;

export interface GeneratorDiagnostics {
  call_count: number;
  last_call_at: string | null;
  last_duration_ms: number | null;
}

export function generatorDiagnostics(): GeneratorDiagnostics {
  return {
    call_count: GENERATOR_CALL_COUNT,
    last_call_at: GENERATOR_LAST_CALL_AT,
    last_duration_ms: GENERATOR_LAST_DURATION_MS,
  };
}

function genLog(event: string, detail: Record<string, unknown> = {}): void {
  // eslint-disable-next-line no-console
  console.log(`[generator] ${event}`, detail);
}

// ============================================================================
// STAGED PIPELINE
//
// The original `generateBriefing()` is a single-shot path: aggregate data,
// call the LLM, assemble the BriefingRead. On Vercel Hobby the LLM step
// pushes the total request past the function-budget envelope, producing
// FUNCTION_INVOCATION_TIMEOUT and connection-closed errors.
//
// The staged pipeline splits the work across two serverless invocations:
//
//   Stage A — shell (this file's `generateBriefingShell`):
//     Aggregates market quotes + calendar + headlines + CB events,
//     assembles a complete BriefingRead with `null` narrative. The shell
//     renders every section the reader can show today; narrative-driven
//     copy falls back to the existing template wording via orTemplate().
//     Targets ~1-3s including cold caches.
//
//   Stage B — narrative hydration (handled by /api/narrative + client):
//     The /api/narrative route fetches the same four feeds (cache-hit
//     fast path), then calls the LLM. The client-side hydrator receives
//     the NarrativeOutput and merges it back into the rendered briefing
//     via `mergeNarrativeIntoBriefing()` below.
//
// Both stages share the data-aggregation helper and the assembly step so
// every section, provenance line, generation_metadata field, and
// diagnostic surfaced before continues to exist — only their timing
// changes.
// ============================================================================

interface AggregatedData {
  quotes: MarketQuote[];
  calendarEvents: CalendarEvent[];
  headlines: Headline[];
  cbEvents: CBEvent[];
  geoEvents: GeoEvent[];
  byInstrument: Map<string, MarketQuote>;
}

const QUOTE_SLUGS = ["eurusd", "dxy", "us2y", "us10y", "brent", "gold", "vix"];

/**
 * Stage A.1 — fan-out to every data feed in parallel. Each feed is
 * cached individually (1-15 min depending on provider) so this runs
 * fast on warm caches and exits within Vercel's serverless budget even
 * on cold caches.
 */
async function aggregateData(): Promise<AggregatedData> {
  const tFetch = Date.now();
  const [quotes, calendarEvents, headlines, cbEvents, geoEvents] = await Promise.all([
    Promise.all(QUOTE_SLUGS.map((s) => getQuote(s))),
    getCalendarEvents(),
    getBriefingHeadlines(10),
    getBriefingCBEvents(8),
    getBriefingGeoEvents(12),
  ]);
  genLog("data-fetched", {
    took_ms: Date.now() - tFetch,
    quotes: quotes.length,
    quotes_with_value: quotes.filter((q) => q.value !== null).length,
    calendar_events: calendarEvents.length,
    headlines: headlines.length,
    cb_events: cbEvents.length,
    geo_events: geoEvents.length,
  });
  const byInstrument = new Map<string, MarketQuote>();
  for (const q of quotes) byInstrument.set(q.instrument, q);
  return { quotes, calendarEvents, headlines, cbEvents, geoEvents, byInstrument };
}

/**
 * Stage A.2 — given aggregated data + (optionally) a synthesised
 * narrative, produce the BriefingRead. Used by both `generateBriefing`
 * (with a narrative) and `generateBriefingShell` (without).
 */
async function assembleBriefing(
  dateIso: string,
  data: AggregatedData,
  narrative: NarrativeOutput | null,
): Promise<BriefingRead> {
  const { calendarEvents, headlines, cbEvents, geoEvents, byInstrument } = data;
  const intelligence = await buildIntelligence(byInstrument, calendarEvents, headlines, cbEvents, geoEvents, narrative);

  const now = new Date().toISOString();
  const longDate = formatLongDate(dateIso);

  const desks = selectBriefingEvents(calendarEvents).length;
  const tmplHeadline =
    "Overnight session, repricing and catalyst load into European cash open.";
  const tmplExecSummary =
    "Pre-market institutional brief.\n\n" +
    `Today's catalyst load: ${desks} desk-relevant scheduled events, plus the ` +
    "overnight geopolitical and central-bank flow surfaced inline. The " +
    "register below reads change against the prior session — what " +
    "moved, what repriced, what got missed — and frames the swing variables " +
    "the desk watches into the European cash open.";
  const tmplFx =
    `EUR/USD ${fmtValue(byInstrument.get("EUR/USD"))} · DXY ${fmtValue(byInstrument.get("DXY"))}. ` +
    "Overnight session reads off front-end yield divergence and any " +
    "central-bank communication into the morning print window — both " +
    "cleaner cross-asset signals than the spot tape alone.";
  const tmplRates =
    `US 10Y ${fmtValue(byInstrument.get("US 10Y"))} · US 2Y ${fmtValue(byInstrument.get("US 2Y"))}. ` +
    "Curve shape vs the prior session is the key read: front-end leads " +
    "USD strength and EM-FX carry; long-end anchors growth-sensitive equity " +
    "sectors and duration-sensitive credit.";
  const tmplEquities =
    `VIX ${fmtValue(byInstrument.get("VIX"))}. ` +
    "Equity-vol regime is the cross-asset risk-budget gauge: a sustained " +
    "vol-spike drains carry trades and pressures EM-FX before the cash " +
    "tape catches the move.";
  const tmplCommodities =
    `Brent ${fmtValue(byInstrument.get("Brent"))} · Gold ${fmtValue(byInstrument.get("Gold"))}. ` +
    "Energy and gold price the geopolitical-risk overlay: Brent on supply " +
    "concerns + OPEC posture; gold on real-yield direction and safe-haven " +
    "flow on escalation.";

  const narrDiag = narrativeDiagnostics();
  const providerLabel =
    (narrDiag.last_provider ?? narrDiag.provider) === "openrouter"
      ? "OpenRouter"
      : "Anthropic";
  const keyEnvName =
    narrDiag.provider === "openrouter" ? "OPENROUTER_API_KEY" : "ANTHROPIC_API_KEY";
  const narrativeSource = !narrDiag.key_configured
    ? `${providerLabel} — ${keyEnvName} not configured (using template fallback)`
    : narrative
      ? narrDiag.last_result === "cache"
        ? `${providerLabel} · ${narrDiag.last_model} (cached)`
        : `${providerLabel} · ${narrDiag.last_model} (${narrDiag.last_input_tokens}→${narrDiag.last_output_tokens} tokens, ${narrDiag.last_latency_ms}ms)`
      : narrDiag.last_result === "validate-fail"
        ? `${providerLabel} — output failed validation (${narrDiag.last_error}); using template fallback`
        : narrDiag.last_result === "api-fail"
          ? `${providerLabel} — API call failed (${narrDiag.last_error}); using template fallback`
          : `${providerLabel} — narrative hydrating asynchronously`;

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
      geopol_sources: ["WhiteHouse", "StateDept", "USTreasury", "USTR", "UKPM", "HMTreasury", "UKFCDO", "EUCommission", "IMF", "WorldBank", "OPEC"],
      geopol_events_in_window: data.geoEvents.length,
      narrative_provider: narrDiag.provider,
      narrative_last_provider: narrDiag.last_provider,
      narrative_model: narrative ? narrDiag.last_model : null,
      narrative_result: narrDiag.last_result,
      narrative_key_configured: narrDiag.key_configured,
      narrative_last_error: narrDiag.last_error,
      narrative_input_tokens: narrDiag.last_input_tokens,
      narrative_output_tokens: narrDiag.last_output_tokens,
      narrative_latency_ms: narrDiag.last_latency_ms,
      narrative_context_hash: narrDiag.last_context_hash,
      // Per-field "llm" vs "template" map — the single-glance audit
      // surface. If every field shows "template" while key_configured
      // is true, the LLM call or validation is failing; check
      // narrative_last_error.
      narrative_field_sources: narrDiag.last_field_sources,
      narrative_field_counts: narrDiag.last_field_counts,
      // Render stage — "shell" when no narrative is attached (the
      // browser will hydrate via /api/narrative), "full" when the
      // server already merged a narrative on the way out.
      render_stage: narrative ? "full" : "shell",
    },
    desk: "Macro & FX",
    author: "Makor Securities · Macro & FX Desk",
    published_at: now,
    created_at: now,
    updated_at: now,
    data_provenance: narrative ? "live" : "partial",
    demo_disclosure: narrative
      ? null
      : `Live market data, calendar, headlines, and central-bank activity all sourced from connected feeds. Narrative synthesis hydrates asynchronously after page load; while it loads or if the active LLM provider's API key (${narrDiag.provider === "openrouter" ? "OPENROUTER_API_KEY" : "ANTHROPIC_API_KEY"}) is not configured on the server, narrative-driven sections show the institutional template. Per-section source attribution is shown in the Provenance footer of each block.`,
  };
}

/**
 * Full sync path — kept for backend mode and the "Generate now" action
 * where the caller wants a single-shot brief with the narrative already
 * baked in. The page-render path uses `generateBriefingShell` instead.
 */
export async function generateBriefing(dateIso: string): Promise<BriefingRead> {
  if (isDemoMode()) {
    throw new Error("generateBriefing: refusing to run in demo mode");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error(`generateBriefing: invalid date "${dateIso}"`);
  }

  const t0 = Date.now();
  GENERATOR_CALL_COUNT += 1;
  GENERATOR_LAST_CALL_AT = new Date().toISOString();
  const callNumber = GENERATOR_CALL_COUNT;
  genLog("starting", { date: dateIso, call_number: callNumber, mode: "full" });

  const data = await aggregateData();

  const tSynth = Date.now();
  const narrative = await synthesise({
    date_iso: dateIso,
    quotes: data.quotes,
    calendar: data.calendarEvents,
    headlines: data.headlines,
    cb_events: data.cbEvents,
    geo_events: data.geoEvents,
  });
  const narrDiagSnap = narrativeDiagnostics();
  genLog("narrative-resolved", {
    call_number: callNumber,
    took_ms: Date.now() - tSynth,
    narrative_present: !!narrative,
    last_result: narrDiagSnap.last_result,
    last_error: narrDiagSnap.last_error,
    field_counts: narrDiagSnap.last_field_counts,
  });

  const briefing = await assembleBriefing(dateIso, data, narrative);
  GENERATOR_LAST_DURATION_MS = Date.now() - t0;
  genLog("done", {
    call_number: callNumber,
    took_ms: GENERATOR_LAST_DURATION_MS,
    mode: "full",
    narrative_present: !!narrative,
    field_counts: narrDiagSnap.last_field_counts,
  });
  return briefing;
}

/**
 * Shell path — aggregates data, probes the narrative cache (no LLM
 * call), assembles the BriefingRead. Two outcomes:
 *
 *   warm cache → narrative ships baked in (render_stage="full"); the
 *                client hydrator detects this and skips its /api/narrative
 *                call. Page renders fully-hydrated with no LLM latency.
 *
 *   cold cache → narrative is null; render_stage="shell"; the page ships
 *                with template content and the client hydrator fires the
 *                /api/narrative call to upgrade after first paint. This
 *                is the historical Stab-1 contract.
 *
 * Either way the shell function itself does NOT call the LLM, so it lands
 * well inside Vercel Hobby's 60s function budget — critical for the
 * export route which has no client hydration available.
 */
export async function generateBriefingShell(dateIso: string): Promise<BriefingRead> {
  if (isDemoMode()) {
    throw new Error("generateBriefingShell: refusing to run in demo mode");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    throw new Error(`generateBriefingShell: invalid date "${dateIso}"`);
  }

  const t0 = Date.now();
  GENERATOR_CALL_COUNT += 1;
  GENERATOR_LAST_CALL_AT = new Date().toISOString();
  const callNumber = GENERATOR_CALL_COUNT;
  genLog("starting", { date: dateIso, call_number: callNumber, mode: "shell" });

  const data = await aggregateData();
  // Cheap narrative-cache probe. Never calls the LLM. If a recent
  // narrative for today's exact context is already in the in-memory
  // cache, the shell ships with it inline so the page (and any PDF
  // export pulled from this same instance) is fully hydrated on first
  // paint with no LLM latency.
  const cached = peekCachedNarrative({
    date_iso: dateIso,
    quotes: data.quotes,
    calendar: data.calendarEvents,
    headlines: data.headlines,
    cb_events: data.cbEvents,
    geo_events: data.geoEvents,
  });
  const briefing = await assembleBriefing(dateIso, data, cached);
  GENERATOR_LAST_DURATION_MS = Date.now() - t0;
  genLog("done", {
    call_number: callNumber,
    took_ms: GENERATOR_LAST_DURATION_MS,
    mode: "shell",
    narrative_cache: cached ? "hit" : "miss",
  });
  return briefing;
}
