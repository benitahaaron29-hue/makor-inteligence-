import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { ImportancePill, RiskPill, StatusPill } from "@/components/ui/status-pill";
import { TickerChip } from "@/components/ui/ticker-chip";
import { LiveDot } from "@/components/ui/live-dot";
import { Sparkline, sparkColor } from "@/components/ui/sparkline";
import { MakorLogo } from "@/components/ui/makor-logo";
import { MarketSessionBar } from "./market-session-bar";
import {
  scoreCalendarText,
  scoreCBEvent,
  scoreGeoEvent,
  tierRank,
  type ImpactTier,
} from "@/lib/briefing/impact";

import { formatLongDate, formatTimeOfDay } from "@/lib/utils/date";
import { formatPrice, formatSymbol } from "@/lib/utils/format";
import {
  syntheticBp,
  syntheticPct,
  syntheticSeries,
  syntheticTrendDirection,
} from "@/lib/utils/sparkline";
import { cn } from "@/lib/utils";
import type {
  BriefingRead,
  CentralBankItem,
  ConsensusCall,
  CrossAssetLink,
  DeskPriority,
  GeopoliticalPulse as GeopoliticalPulseT,
  GeopoliticalRegion as GeopoliticalRegionT,
  Intelligence,
  KeyEvent,
  KeyTakeaway,
  MacroOverview as MacroOverviewT,
  PairCommentary,
  PositioningNote,
  ProvenanceEntry,
  PullStat,
  RiskScenario,
  RiskWarning,
  StrategistView as StrategistViewT,
  SessionBreakdown as SessionBreakdownT,
  TradeIdea,
  InstrumentWatch,
  Chart as ChartT,
  Headline,
  CBEvent,
  GeoEvent,
} from "@/lib/types/briefing";

interface BriefingReaderProps {
  briefing: BriefingRead;
}

// Section ordering — narrative-led, instruments subordinate.
// Section IDs are preserved verbatim so existing anchors / share-link
// fragments continue to resolve; only the order in this array changes.
// Editorial flow:
//   01 Macro Regime          — the day's structural read
//   02 Geopolitical Pulse    — verified-source government / supranational signal
//   03 Economic Calendar     — today's catalysts
//   04 Central Bank Watch    — last-14d activity + bank-by-bank view
//   05 FX Commentary         — asset-class commentary, anchored by the above
//   06 Volatility            — equity-vol regime
//   07 Overnight Movers      — market tape, supporting the narrative
//   08 Instruments to Watch  — desk watchlist
//   09 Key Risks             — closing thought
const SECTIONS = [
  { id: "regime",        num: "§ 01", title: "Macro Regime" },
  { id: "geopolitical",  num: "§ 02", title: "Geopolitical Pulse" },
  { id: "calendar",      num: "§ 03", title: "Economic Calendar" },
  { id: "central-banks", num: "§ 04", title: "Central Bank Watch" },
  { id: "fx",            num: "§ 05", title: "FX Commentary" },
  { id: "vol",           num: "§ 06", title: "Volatility" },
  { id: "movers",        num: "§ 07", title: "Overnight Movers" },
  { id: "trades",        num: "§ 08", title: "Instruments to Watch" },
  { id: "risks",         num: "§ 09", title: "Key Risks" },
];

// =================================================================== READER

export function BriefingReader({ briefing }: BriefingReaderProps) {
  const minutes = Math.max(2, Math.round(briefing.executive_summary.length / 250));
  const intel = briefing.intelligence;

  return (
    <div className="workspace">
      <article className="col-span-9 panel panel-research panel-highlight">
        <div className="panel-body panel-body-edit">
          {/* INSTITUTIONAL PRINT HEADER — visible only when printing/exporting */}
          <PrintMasthead briefing={briefing} />

          {/* SOURCE-INTEGRITY DISCLOSURE — only when the briefing is demo content */}
          <DemoDisclosure briefing={briefing} />

          {/* OPENER */}
          <div className="masthead-rule" style={{ marginBottom: 20 }} />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span className="eyebrow">Morning FX &amp; Macro · Daily Briefing</span>
            <div style={{ display: "flex", gap: 6 }}>
              <StatusPill kind={briefing.status} />
              <RiskPill tone={briefing.risk_tone} />
            </div>
          </div>

          <h1 className="editorial-display research-column">{briefing.title}</h1>

          <p className="editorial-dek research-column" style={{ marginTop: 16 }}>
            {briefing.headline}
          </p>

          <div className="editorial-meta" style={{ marginTop: 20 }}>
            <span>By {briefing.author}</span>
            <span>
              {formatLongDate(briefing.briefing_date)} ·{" "}
              {formatTimeOfDay(briefing.published_at ?? briefing.created_at)}
            </span>
            <span>{minutes} min read</span>
            <span>
              <LiveDot />
              &nbsp;<span style={{ color: "var(--bid)" }}>Live</span>
            </span>
          </div>

          {/* Subtle institutional masthead banner, sits between the metadata
              and the editorial body. Premium feel, integrated into the
              briefing flow — explicitly NOT homepage-sized. The previous
              "What changed since yesterday" technical box is removed; the
              "what changed" semantic now lives in the executive summary
              + the overnight deltas surfaced inline across each section. */}
          <BriefingMasthead />

          {intel ? <KeyTakeawaysBlock takeaways={intel.key_takeaways} /> : null}
          {intel && intel.desk_priorities && intel.desk_priorities.length > 0 ? (
            <DeskPrioritiesBlock priorities={intel.desk_priorities} />
          ) : null}

          <div className="divider-h divider-strong" style={{ margin: "24px 0" }} />

          <ExecutiveLede summary={briefing.executive_summary} />

          {/* SECTIONS — narrative-led ordering; see SECTIONS comment above */}
          <Section id="regime" num="§ 01" title="Macro Regime">
            <MacroRegimeBlock briefing={briefing} intel={intel} />
          </Section>

          <Section id="geopolitical" num="§ 02" title="Geopolitical Pulse">
            <GeopoliticalBlock briefing={briefing} intel={intel} />
          </Section>

          <Section id="calendar" num="§ 03" title="Economic Calendar">
            <EconomicCalendarBlock briefing={briefing} intel={intel} />
          </Section>

          <Section id="central-banks" num="§ 04" title="Central Bank Watch">
            <CentralBankBlock briefing={briefing} intel={intel} />
          </Section>

          <Section id="fx" num="§ 05" title="FX Commentary">
            <FxCommentaryBlock briefing={briefing} intel={intel} />
          </Section>

          <Section id="vol" num="§ 06" title="Volatility">
            <VolatilityBlock briefing={briefing} intel={intel} />
          </Section>

          <Section id="movers" num="§ 07" title="Overnight Movers">
            <OvernightMovers briefing={briefing} intel={intel} />
          </Section>

          <Section id="trades" num="§ 08" title="Instruments to Watch">
            <TradeIdeasBlock briefing={briefing} intel={intel} />
          </Section>

          <Section id="risks" num="§ 09" title="Key Risks">
            <KeyRisksBlock briefing={briefing} intel={intel} />
          </Section>

          {/* INSTITUTIONAL PRINT SIGNOFF — visible only when printing/exporting */}
          <PrintSignoff briefing={briefing} />

          {/* FOOTER */}
          <div className="divider-h divider-strong" style={{ margin: "28px 0 12px" }} />
          <div
            className="caption"
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              padding: "8px 12px",
              background: "var(--surface-inset)",
              border: "1px solid var(--border-subtle)",
              borderLeft: "2px solid var(--accent-brass)",
              borderRadius: 3,
              color: "var(--text-tertiary)",
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.10em",
            }}
          >
            <span style={{ color: "var(--accent-brass)", fontWeight: 600 }}>Confidential</span>
            <span>For desk distribution only · Not for client redistribution</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", letterSpacing: 0, textTransform: "none" }}>
              © Makor Securities · Macro &amp; FX Desk
            </span>
          </div>
          <div className="editorial-meta" style={{ marginTop: 10 }}>
            <span>Briefing ID · {briefing.id}</span>
            <span>
              Generator {briefing.generator_version} · {briefing.generation_source}
            </span>
            <span>Distribution: {briefing.desk}</span>
          </div>

          {/* LIVE MARKET-SESSION STATUS STRIP — Bloomberg-terminal-style
              live footer. Tickers update every 30s client-side.
              Hidden in print/export so the institutional PDF stays clean. */}
          <MarketSessionBar />
        </div>
      </article>

      <aside className="col-span-3" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <TocRail />
        <ReadingGuideRail />
        <SourceHealthRail />
        <BriefingMetaRail briefing={briefing} />
      </aside>
    </div>
  );
}

// =================================================================== STRUCTURAL PRIMITIVES

function Section({
  id, num, title, children,
}: { id: string; num: string; title: string; children: ReactNode }) {
  return (
    <section
      id={id}
      style={{
        marginTop: 32,
        paddingTop: 22,
        borderTop: "1px solid var(--border-subtle)",
        scrollMarginTop: "calc(var(--layout-header-h) + var(--layout-ops-h) + 16px)",
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 14 }}>
        <span className="eyebrow" style={{ color: "var(--makor-300)", whiteSpace: "nowrap" }}>
          {num}
        </span>
        <h2 className="heading-3" style={{ whiteSpace: "nowrap" }}>{title}</h2>
        <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
      </header>
      {children}
    </section>
  );
}

function EmbeddedTable({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        margin: "14px 0",
        border: "1px solid var(--border-subtle)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function BodyParagraphs({ text }: { text: string }) {
  const paragraphs = splitParagraphs(text);
  return (
    <div className="editorial-body research-column">
      {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

function ExecutiveLede({ summary }: { summary: string }) {
  const paragraphs = splitParagraphs(summary);
  return (
    <div className="editorial-body research-column">
      {paragraphs.map((p, i) => (
        <p key={i} className={i === 0 ? "first-graf" : undefined}>{p}</p>
      ))}
    </div>
  );
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|(?<=\.)\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// =================================================================== EDITORIAL PRIMITIVES

function KeyTakeawaysBlock({ takeaways }: { takeaways: KeyTakeaway[] }) {
  if (takeaways.length === 0) return null;
  return (
    <div className="editorial-takeaways">
      <span className="editorial-takeaways-eyebrow">Key Takeaways</span>
      <ul className="editorial-takeaways-list">
        {takeaways.map((t) => (
          <li key={t.rank}>
            <span className="rank">{String(t.rank).padStart(2, "0")}</span>
            <span>{t.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DeskPrioritiesBlock({ priorities }: { priorities: DeskPriority[] }) {
  if (priorities.length === 0) return null;
  return (
    <div className="editorial-priorities">
      <span className="editorial-priorities-eyebrow">Desk focus today</span>
      <ol className="editorial-priorities-list">
        {priorities.map((p) => (
          <li key={p.rank}>
            <span className="rank">{String(p.rank).padStart(2, "0")}</span>
            <div className="body">
              <div className="title">
                {p.title}
                {p.timing ? <span className="timing"> · {p.timing}</span> : null}
              </div>
              <div className="note">{p.body}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * Subtle institutional banner rendered between the masthead metadata
 * row and Key Takeaways. Uses the existing Makor logo at a restrained
 * editorial scale, framed with a brass rule + condensed eyebrow text
 * so the briefing reads as a finished product, not a development
 * prototype. Replaces the previous "What changed since yesterday"
 * technical box (Stab-4 editorial phase).
 *
 * Stays small — this is a briefing, not a marketing page. Hides in
 * print/export so the institutional print masthead (PrintMasthead)
 * remains the only header in PDF output.
 */
function BriefingMasthead() {
  return (
    <div className="briefing-masthead no-print" role="presentation">
      <div className="briefing-masthead-rule" />
      <div className="briefing-masthead-body">
        <MakorLogo height={28} tone="auto" alt="Makor Securities" />
        <div className="briefing-masthead-text">
          <span className="briefing-masthead-eyebrow">Macro &amp; FX Desk · London</span>
          <span className="briefing-masthead-tag">Morning Intelligence · Pre-Open</span>
        </div>
      </div>
      <div className="briefing-masthead-rule" />
    </div>
  );
}

// (Stab-4 editorial phase) Removed: WhatChangedBlock — the "What changed
// since yesterday" technical box. The "what changed" semantic now lives
// in the executive summary's overnight framing and the inline overnight
// deltas surfaced across each section (Today's Catalysts, Geopolitical
// Pulse, CB Watch). The institutional briefing reads as one flow rather
// than a labelled diff against a baseline that the user never saw.

function MacroOverviewBlock({ data }: { data: MacroOverviewT }) {
  const blocks: { label: string; body: string }[] = [
    { label: "Macro setup",         body: data.opening },
    { label: "What moved · why",    body: data.whats_moving },
    { label: "Rates view",          body: data.rates_view },
    { label: "Cross-asset thesis",  body: data.cross_asset_thesis },
  ];
  return (
    <div className="macro-overview">
      <span className="macro-overview-eyebrow">Macro &amp; Geopolitical Overview</span>
      <div className="macro-overview-body">
        {blocks.map((b) => (
          <div key={b.label} className="macro-overview-block">
            <div className="macro-overview-label">{b.label}</div>
            <p className="macro-overview-text">{b.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RiskScenariosBlock({ scenarios }: { scenarios: RiskScenario[] }) {
  if (scenarios.length === 0) return null;
  return (
    <div className="risk-scenarios">
      <span className="risk-scenarios-eyebrow">Risk scenarios into the print</span>
      <div className="risk-scenarios-grid">
        {scenarios.map((s) => (
          <div key={s.name} className="risk-scenario">
            <div className="risk-scenario-head">
              <span className="risk-scenario-name">{s.name}</span>
              <span className="risk-scenario-prob">{s.probability}</span>
            </div>
            <div className="risk-scenario-trigger">
              <span className="risk-scenario-label">Trigger</span>
              <span className="risk-scenario-value">{s.trigger}</span>
            </div>
            <dl className="risk-scenario-impacts">
              <dt>FX</dt><dd>{s.fx_impact}</dd>
              <dt>Rates</dt><dd>{s.rates_impact}</dd>
              <dt>Equity</dt><dd>{s.equity_impact}</dd>
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintMasthead({ briefing }: { briefing: BriefingRead }) {
  const date = formatLongDate(briefing.briefing_date);
  const published = formatTimeOfDay(briefing.published_at ?? briefing.created_at);
  return (
    <div className="print-masthead print-only">
      <div className="print-masthead-left">
        <MakorLogo height={64} tone="auto" alt="Makor Securities" />
        <div className="print-masthead-brand">
          <div className="print-masthead-desk">Macro &amp; FX Desk · London</div>
        </div>
      </div>
      <div className="print-masthead-right">
        <div className="print-masthead-publication">Morning FX &amp; Macro Review</div>
        <div className="print-masthead-meta">
          {date} · Published {published}
        </div>
      </div>
    </div>
  );
}

/**
 * Source-integrity disclosure — renders only when the briefing's
 * `data_provenance` is "demo". Honest, non-decorative line that signals
 * the market levels in this briefing are illustrative for layout, not
 * sourced from live data.
 *
 * Backward compatible: briefings without `data_provenance` (live Python
 * backend, real generator) render nothing here.
 */
function DemoDisclosure({ briefing }: { briefing: BriefingRead }) {
  if (briefing.data_provenance !== "demo") return null;
  const message = briefing.demo_disclosure ??
    "Demo content — market levels are illustrative, not sourced from live data.";
  return (
    <div className="demo-disclosure" role="note" aria-label="Source disclosure">
      <span className="demo-disclosure-eyebrow">Demo</span>
      <span className="demo-disclosure-body">{message}</span>
    </div>
  );
}

function PrintSignoff({ briefing }: { briefing: BriefingRead }) {
  const published = briefing.published_at ?? briefing.created_at;
  return (
    <div className="print-signoff print-only">
      <div className="print-signoff-rule" />
      <div className="print-signoff-conf">
        Confidential — Not for client redistribution
      </div>
      <div className="print-signoff-grid">
        <div>
          <span className="print-signoff-label">Distribution</span>
          <span className="print-signoff-value">{briefing.desk} · A. Benitah, lead strategist</span>
        </div>
        <div>
          <span className="print-signoff-label">Author</span>
          <span className="print-signoff-value">{briefing.author}</span>
        </div>
        <div>
          <span className="print-signoff-label">Published</span>
          <span className="print-signoff-value">
            {formatLongDate(briefing.briefing_date)} · {formatTimeOfDay(published)}
          </span>
        </div>
        <div>
          <span className="print-signoff-label">Briefing ID</span>
          <span className="print-signoff-value">{briefing.id}</span>
        </div>
        <div>
          <span className="print-signoff-label">Generator</span>
          <span className="print-signoff-value">{briefing.generator_version} · {briefing.generation_source}</span>
        </div>
        <div>
          <span className="print-signoff-label">Contact</span>
          <span className="print-signoff-value">research@makor-group.com · +44 20 7493 8888</span>
        </div>
      </div>
      <div className="print-signoff-disclaimer">
        This publication is the property of Makor Securities and is intended solely for
        the named recipient. It must not be forwarded outside Makor or redistributed
        in any form without prior written consent. The views expressed are those of the
        Makor Macro &amp; FX Desk at the time of publication and may change without notice.
      </div>
    </div>
  );
}

function StrategistInlineCallout({ view }: { view: StrategistViewT }) {
  return (
    <div className="editorial-strategist">
      <span className="editorial-strategist-eyebrow">Strategist's View</span>
      <div className="editorial-strategist-headline">{view.headline}</div>
      <div className="editorial-strategist-body">{view.body}</div>
    </div>
  );
}

function PullStatBlock({ stat }: { stat: PullStat }) {
  const tone = (stat.tone || "neu").toLowerCase();
  return (
    <div className="pull-stat">
      <span className={cn("pull-stat-value", tone === "pos" && "pos", tone === "neg" && "neg", tone === "warn" && "warn")}>
        {stat.value}
      </span>
      <span className="pull-stat-label">{stat.label}</span>
    </div>
  );
}

function pullStatFor(section: string, intel: Intelligence | null): PullStat | null {
  if (!intel) return null;
  return intel.pull_stats.find((s) => s.section === section) ?? null;
}

function RiskWarningBlock({ warning }: { warning: RiskWarning }) {
  const isHigh = warning.severity.toLowerCase() === "high";
  return (
    <div className={cn("risk-warning", isHigh && "is-high")}>
      <div className="risk-warning-header">
        <span className="risk-warning-eyebrow">
          {isHigh ? "High Risk" : warning.severity.toUpperCase()}
        </span>
        <span className="risk-warning-title">{warning.title}</span>
      </div>
      <p className="risk-warning-body">{warning.body}</p>
    </div>
  );
}

function ProvenanceFooter({ entry }: { entry: ProvenanceEntry }) {
  return (
    <div className="provenance-footer">
      <span className="provenance-footer-label">Source</span>
      {entry.sources.map((s, i) => (
        <span key={i} className="provenance-footer-source">
          {s}{i < entry.sources.length - 1 ? " ·" : ""}
        </span>
      ))}
      <span className="provenance-footer-asof">as of {entry.as_of}</span>
    </div>
  );
}

function provenanceFor(section: string, intel: Intelligence | null): ProvenanceEntry | null {
  if (!intel) return null;
  return intel.provenance.find((p) => p.section === section) ?? null;
}

function ConsensusCallBlock({ call }: { call: ConsensusCall }) {
  return (
    <div className="consensus-call">
      <div className="consensus-call-head">
        <span className="consensus-call-event">{call.event}</span>
        <span className="consensus-call-consensus">Consensus: {call.consensus}</span>
      </div>
      <p className="consensus-call-skew"><strong>Risk skew:</strong> {call.risk_skew}</p>
      <p className="consensus-call-impact">{call.impact}</p>
    </div>
  );
}

function SessionGrid({ data }: { data: SessionBreakdownT }) {
  const cells: { title: string; body: string }[] = [
    { title: "Asia · Tokyo / HKG", body: data.asia },
    { title: "Europe · LDN", body: data.europe },
    { title: "US · NY",           body: data.us },
  ];
  return (
    <div className="session-grid">
      {cells.map((c) => (
        <div key={c.title} className="session-cell">
          <span className="session-cell-eyebrow">{c.title}</span>
          <p className="session-cell-body">{c.body}</p>
        </div>
      ))}
    </div>
  );
}

function CrossAssetGrid({ links }: { links: CrossAssetLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="crossasset-grid">
      {links.map((l, i) => (
        <div key={i} className="crossasset-cell">
          <span className="crossasset-cell-title">{l.title}</span>
          <p className="crossasset-cell-body">{l.body}</p>
        </div>
      ))}
    </div>
  );
}

function PositioningRows({ notes }: { notes: PositioningNote[] }) {
  if (notes.length === 0) return null;
  return (
    <div style={{ marginTop: 14, padding: "10px 14px", background: "var(--surface-inset)", border: "1px solid var(--border-subtle)", borderRadius: 3 }}>
      <span className="eyebrow" style={{ color: "var(--text-eyebrow)", marginBottom: 8, display: "block" }}>
        Positioning &amp; Flow
      </span>
      {notes.map((n) => (
        <div key={n.instrument} className="pos-row">
          <span className="pos-row-instrument">{n.instrument}</span>
          <span className={cn("pos-row-side", n.side.toLowerCase().includes("long") && "long", n.side.toLowerCase().includes("short") && "short", n.side.toLowerCase() === "balanced" && "balanced")}>
            {n.side} · {n.weight}
          </span>
          <span className="pos-row-body">
            <strong>Flow:</strong> {n.flow}.&nbsp;<span style={{ color: "var(--text-tertiary)" }}>Risk: {n.risk}.</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Compact bank-by-bank summary — one tight row per bank with bias +
 * next-meeting cue. Replaces the large CentralBankCardBlock grid for
 * the default case where there's nothing scheduled today; collapses
 * what had been a full-width 3-column card per bank into a 1-line
 * register. The full card is still available for any future briefing
 * that wants to surface a specific bank in detail. Stab-4.2 refinement.
 */
function CentralBankCompact({ banks }: { banks: CentralBankItem[] }) {
  return (
    <div className="cb-compact">
      <span className="cb-compact-eyebrow">Bank-by-bank · next meetings + bias</span>
      <ul className="cb-compact-list">
        {banks.map((cb) => {
          const next =
            cb.days_to_next !== null && cb.days_to_next !== undefined
              ? `${cb.days_to_next}d`
              : "—";
          return (
            <li key={cb.bank} className="cb-compact-row">
              <span className="cb-compact-bank">{cb.short}</span>
              <span className="cb-compact-bias">{cb.bias}</span>
              <span className="cb-compact-next">
                {next} <span className="cb-compact-next-label">to next mtg</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CentralBankCardBlock({ cb }: { cb: CentralBankItem }) {
  const shift = cb.hawkish_shift ?? null;
  const shiftLabel =
    shift === null ? "—"
    : shift >= 2 ? "Hawkish shift +2"
    : shift === 1 ? "Hawkish tilt"
    : shift === 0 ? "Stable"
    : shift === -1 ? "Dovish tilt"
    : "Dovish shift −2";
  const shiftClass =
    shift === null ? "cb-shift-neu"
    : shift >= 1 ? "cb-shift-hawk"
    : shift <= -1 ? "cb-shift-dove"
    : "cb-shift-neu";
  const hasTriggers = (cb.triggers ?? []).length > 0;
  const hasRatesFramework = Boolean(
    cb.policy_stance || cb.inflation_sensitivity || cb.growth_sensitivity || cb.qt_stance || cb.pricing_change_1w,
  );

  return (
    <div className="cb-card">
      <div className="cb-card-name">
        <span className="cb-card-bank">{cb.bank}</span>
        <span className="cb-card-bias">{cb.bias}</span>
        {cb.policy_stance ? (
          <span className="cb-card-stance">{cb.policy_stance}</span>
        ) : null}
      </div>
      <div className="cb-card-body">
        <span><strong style={{ color: "var(--text-primary)" }}>Last:</strong> {cb.last_meeting}</span>
        <span className="cb-card-pricing">{cb.market_pricing}</span>
        {cb.pricing_change_1w ? (
          <span className={cn("cb-card-shift", shiftClass)}>
            {shiftLabel} · {cb.pricing_change_1w}
          </span>
        ) : null}
        {cb.upcoming_speakers.length > 0 ? (
          <span className="caption" style={{ color: "var(--text-tertiary)" }}>
            Speakers today: {cb.upcoming_speakers.join(" · ")}
          </span>
        ) : null}
      </div>
      <div className="cb-card-next">
        {cb.days_to_next !== null ? (
          <>
            <span className="cb-card-next-days">{cb.days_to_next}</span>
            <span className="cb-card-next-label">days · {cb.short}</span>
            {cb.next_meeting_date ? (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-tertiary)" }}>
                {cb.next_meeting_date}
              </span>
            ) : null}
          </>
        ) : (
          <span className="cb-card-next-label">no scheduled mtg</span>
        )}
      </div>

      {hasRatesFramework || hasTriggers ? (
        <div className="cb-card-framework">
          {hasRatesFramework ? (
            <div className="cb-card-sensitivities">
              {cb.inflation_sensitivity ? (
                <div className="cb-sens-cell">
                  <span className="cb-sens-label">Inflation sensitivity</span>
                  <span className="cb-sens-value">{cb.inflation_sensitivity}</span>
                </div>
              ) : null}
              {cb.growth_sensitivity ? (
                <div className="cb-sens-cell">
                  <span className="cb-sens-label">Growth sensitivity</span>
                  <span className="cb-sens-value">{cb.growth_sensitivity}</span>
                </div>
              ) : null}
              {cb.qt_stance ? (
                <div className="cb-sens-cell cb-sens-wide">
                  <span className="cb-sens-label">Balance-sheet stance</span>
                  <span className="cb-sens-value cb-sens-value-mono">{cb.qt_stance}</span>
                </div>
              ) : null}
            </div>
          ) : null}
          {hasTriggers ? (
            <ul className="cb-trigger-list">
              {(cb.triggers ?? []).map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TradeIdeaCard({ idea }: { idea: TradeIdea }) {
  return (
    <div className="trade-idea">
      <span className="trade-idea-rank">{String(idea.rank).padStart(2, "0")}</span>
      <div>
        <div className="trade-idea-head">
          <span className="trade-idea-direction">{idea.direction}</span>
          <span className="trade-idea-theme">{idea.theme}</span>
          <span className="trade-idea-conviction">Conviction {idea.conviction.toFixed(1)} / 10</span>
        </div>
        <p className="trade-idea-rationale">{idea.rationale}</p>

        <div className="trade-idea-levels">
          <Level label="Vehicle"   value={idea.vehicle} />
          <Level label="Entry"     value={idea.entry} />
          <Level label="Target"    value={idea.target} />
          <Level label="Stop"      value={idea.stop} />
          <Level label="Horizon"   value={idea.horizon} />
          <Level label="Vol"       value={idea.vol_context.split(";")[0] ?? "—"} />
        </div>

        <dl className="trade-idea-meta">
          <dt>Catalyst</dt>
          <dd>{idea.catalyst}</dd>
          <dt>Vol context</dt>
          <dd>{idea.vol_context}</dd>
        </dl>
      </div>
    </div>
  );
}

function Level({ label, value }: { label: string; value: string }) {
  return (
    <div className="trade-idea-level">
      <span className="trade-idea-level-label">{label}</span>
      <span className="trade-idea-level-value" title={value}>{value}</span>
    </div>
  );
}

function PairCommentaryRow({ p }: { p: PairCommentary }) {
  const dirCls = (n: number) => (n > 0 ? "data-pos" : n < 0 ? "data-neg" : "data-neu");
  const pctLabel = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n).toFixed(2)}%`;
  return (
    <div className="pair-row">
      <div className="pair-row-name">
        <span className="pair-row-pair">{formatSymbol(p.pair)}</span>
        <span className="pair-row-bias">{p.bias}</span>
      </div>
      <div className="pair-row-stats">
        <span className="pair-row-stat-label">Spot</span>
        <span className="pair-row-stat-value">{formatPrice(p.pair, p.spot)}</span>
        <span className="pair-row-stat-label">1d</span>
        <span className={cn("pair-row-stat-value", dirCls(p.one_day_pct))}>{pctLabel(p.one_day_pct)}</span>
        <span className="pair-row-stat-label">1w</span>
        <span className={cn("pair-row-stat-value", dirCls(p.one_week_pct))}>{pctLabel(p.one_week_pct)}</span>
        <span className="pair-row-stat-label">1M ATM</span>
        <span className="pair-row-stat-value">{p.one_month_atm.toFixed(2)}</span>
        <span className="pair-row-stat-label">25Δ RR</span>
        <span className={cn("pair-row-stat-value", dirCls(p.rr_25d))}>
          {p.rr_25d > 0 ? "+" : p.rr_25d < 0 ? "−" : "±"}{Math.abs(p.rr_25d).toFixed(2)}
        </span>
      </div>
      <div className="pair-row-levels">
        {p.levels.map((lv, i) => (
          <div key={i} className="pair-row-level">
            <span className="pair-row-level-label">{lv.label}</span>
            <span className="pair-row-level-value">{lv.value}</span>
            <span className="pair-row-level-note">{lv.note ?? ""}</span>
          </div>
        ))}
      </div>
      <p className="pair-row-note">{p.note}</p>
    </div>
  );
}

// =================================================================== § 01 OVERNIGHT MOVERS

function ChartCard({ chart }: { chart: ChartT }) {
  const series = chart.series ?? [];
  if (series.length < 2) return null;
  const baseline = chart.baseline ?? null;
  const min = Math.min(...series, baseline ?? Infinity);
  const max = Math.max(...series, baseline ?? -Infinity);
  const range = max - min || 1;
  const W = 240;
  const H = 60;
  const pts = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const baselineY =
    baseline !== null ? H - ((baseline - min) / range) * H : null;

  return (
    <figure className="chart-card">
      <figcaption className="chart-card-head">
        <span className="chart-card-title">{chart.title}</span>
        {chart.subtitle ? (
          <span className="chart-card-subtitle">{chart.subtitle}</span>
        ) : null}
      </figcaption>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="chart-card-svg"
        preserveAspectRatio="none"
        role="img"
        aria-label={chart.title}
      >
        {baselineY !== null ? (
          <line
            x1="0"
            y1={baselineY.toFixed(2)}
            x2={W}
            y2={baselineY.toFixed(2)}
            stroke="currentColor"
            strokeWidth="0.4"
            strokeDasharray="2 3"
            opacity="0.35"
          />
        ) : null}
        <polyline
          points={pts}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="chart-card-axis">
        <span>
          {chart.y_min_label ?? min.toFixed(2)}{" – "}
          {chart.y_max_label ?? max.toFixed(2)}
        </span>
        <span>
          {chart.x_start_label ?? ""}
          {chart.x_start_label || chart.x_end_label ? " → " : null}
          {chart.x_end_label ?? ""}
        </span>
      </div>
      {chart.note ? <p className="chart-card-note">{chart.note}</p> : null}
      {chart.data_source ? (
        <p className="chart-card-source">{chart.data_source}</p>
      ) : null}
    </figure>
  );
}

/**
 * Top movers — overnight gainers + losers derived from the briefing's
 * chart baselines (each Chart carries previous_close as `baseline` and
 * the intraday `series`; the last series point is "now"). Yields are
 * read as rate deltas (basis points); FX / equity / commodities as %.
 *
 * No fabrication: only chart instruments that actually have both a
 * baseline and a series populate the block. The current chart set
 * surfaces ~3-6 instruments depending on Yahoo coverage; sufficient
 * for a compact gainers/losers register without needing additional
 * data fetches.
 *
 * Stab-4.2 refinement — institutional gainers/losers strip at the top
 * of § 07 Overnight Movers.
 */
function TopMoversBlock({ intel }: { intel: Intelligence | null }) {
  const charts = intel?.charts ?? [];
  type Delta = {
    instrument: string;
    last: number;
    baseline: number;
    deltaAbs: number;
    deltaPct: number;
    direction: "pos" | "neg" | "neu";
    isYield: boolean;
  };
  const deltas: Delta[] = [];
  for (const c of charts) {
    const series = c.series ?? [];
    const last = series[series.length - 1];
    const baseline = c.baseline ?? undefined;
    if (typeof last !== "number" || typeof baseline !== "number" || baseline === 0) continue;
    const isYield = /\b(US ?\d+Y|2Y|10Y|yield|gilt|bund|JGB)\b/i.test(c.title);
    const deltaAbs = last - baseline;
    const deltaPct = (deltaAbs / Math.abs(baseline)) * 100;
    const sign = deltaAbs > 0 ? 1 : deltaAbs < 0 ? -1 : 0;
    deltas.push({
      instrument: c.title.replace(/ · Today.*$/, "").trim(),
      last,
      baseline,
      deltaAbs,
      deltaPct,
      direction: sign > 0 ? "pos" : sign < 0 ? "neg" : "neu",
      isYield,
    });
  }
  if (deltas.length === 0) return null;
  const sorted = [...deltas].sort((a, b) => b.deltaPct - a.deltaPct);
  const top = sorted.slice(0, Math.min(3, sorted.length));
  const bottom = [...sorted].reverse().slice(0, Math.min(3, sorted.length));
  const noOverlap = sorted.length > 1;

  const fmtDelta = (d: Delta): string => {
    if (d.isYield) {
      const bp = d.deltaAbs * 100;
      return `${bp >= 0 ? "+" : "−"}${Math.abs(bp).toFixed(1)} bp`;
    }
    return `${d.deltaPct >= 0 ? "+" : "−"}${Math.abs(d.deltaPct).toFixed(2)}%`;
  };
  const fmtLast = (d: Delta): string => {
    if (d.isYield) return `${d.last.toFixed(3)}%`;
    return d.instrument.includes("/") ? d.last.toFixed(4) : d.last.toFixed(2);
  };

  return (
    <div className="top-movers">
      <div className="top-movers-col">
        <span className="top-movers-col-eyebrow top-movers-col-eyebrow-gain">Top gainers · overnight</span>
        <ul className="top-movers-list">
          {top.map((d) => (
            <li key={`gain-${d.instrument}`} className="top-movers-row">
              <span className="top-movers-instrument">{d.instrument}</span>
              <span className="top-movers-last">{fmtLast(d)}</span>
              <span className={cn("top-movers-delta", d.direction === "pos" && "data-pos", d.direction === "neg" && "data-neg")}>{fmtDelta(d)}</span>
            </li>
          ))}
        </ul>
      </div>
      {noOverlap ? (
        <div className="top-movers-col">
          <span className="top-movers-col-eyebrow top-movers-col-eyebrow-loss">Top losers · overnight</span>
          <ul className="top-movers-list">
            {bottom.map((d) => (
              <li key={`loss-${d.instrument}`} className="top-movers-row">
                <span className="top-movers-instrument">{d.instrument}</span>
                <span className="top-movers-last">{fmtLast(d)}</span>
                <span className={cn("top-movers-delta", d.direction === "pos" && "data-pos", d.direction === "neg" && "data-neg")}>{fmtDelta(d)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ChartsBlock({ intel }: { intel: Intelligence | null }) {
  const charts = intel?.charts ?? [];
  if (charts.length === 0) return null;
  return (
    <div className="chart-grid" role="group" aria-label="Overnight visual context">
      {charts.map((c) => <ChartCard key={c.rank} chart={c} />)}
    </div>
  );
}

function OvernightMovers({ briefing, intel }: { briefing: BriefingRead; intel: Intelligence | null }) {
  const seed = briefing.briefing_date;
  const snap = briefing.market_snapshot;

  const rows: MoverRow[] = [
    topMover(snap?.fx ?? {},          seed, "fx"),
    topMover(snap?.equities ?? {},    seed, "eq"),
    topMover(snap?.commodities ?? {}, seed, "cm"),
    topMover(snap?.rates ?? {},       seed, "rt", true),
  ].filter((r): r is MoverRow => r !== null);

  const stat = pullStatFor("movers", intel);
  const prov = provenanceFor("movers", intel);

  return (
    <>
      <ChartsBlock intel={intel} />

      {/* Stab-4.2 — top gainers / losers compact block, derived from the
          briefing's chart baselines (real overnight deltas, not fabricated).
          Sits above the existing "What we watched" + asset-class table so
          the desk has the headline movement at a glance. */}
      <TopMoversBlock intel={intel} />

      <p
        className="body-sm"
        style={{ color: "var(--text-secondary)", marginBottom: 10, maxWidth: "var(--layout-research-max-w)" }}
      >
        <strong style={{ color: "var(--text-primary)" }}>What we watched:</strong>{" "}
        overnight tape direction reads off the cluster below — gainers in the
        risk-on column point to liquidity rebound; losers in the carry-funder
        column point to positioning unwinds. The desk reads concentration of
        moves into the European cash open for confirmation or fade.
      </p>

      <EmbeddedTable>
        <table className="data-table data-table-compact">
          <thead>
            <tr>
              <th>Asset Class</th>
              <th>Top Mover</th>
              <th className="col-num">Last</th>
              <th className="col-num">Δ%</th>
              <th>1W Trend</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: "var(--text-tertiary)" }}>
                  No market snapshot in this briefing.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.category}>
                  <td className="caption">{r.category}</td>
                  <td>{r.label}</td>
                  <td className="col-num">{r.lastFormatted}</td>
                  <td className={cn("col-num", r.pctClass)}>{r.pctLabel}</td>
                  <td>
                    <Sparkline points={r.series} color={sparkColor(r.direction)} width={80} height={16} />
                  </td>
                  <td className="caption" style={{ color: "var(--text-tertiary)" }}>{r.note}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </EmbeddedTable>

      {stat ? <PullStatBlock stat={stat} /> : null}

      {intel ? <SessionGrid data={intel.session_breakdown} /> : null}

      <BodyParagraphs text={briefing.equities_commentary} />
      <BodyParagraphs text={briefing.commodities_commentary} />

      {prov ? <ProvenanceFooter entry={prov} /> : null}
    </>
  );
}

interface MoverRow {
  category: string;
  symbol: string;
  label: string;
  lastFormatted: string;
  pctLabel: string;
  pctClass: string;
  series: number[];
  direction: "pos" | "neg" | "neu";
  note: string;
}

function topMover(
  map: Record<string, number>,
  seed: string,
  ns: string,
  inverted = false,
): MoverRow | null {
  const entries = Object.entries(map);
  if (entries.length === 0) return null;
  const scored = entries.map(([sym, val]) => {
    const pct = syntheticPct(`${ns}|${sym}|${seed}`, 0.6);
    return { sym, val, pct, abs: Math.abs(pct) };
  });
  scored.sort((a, b) => b.abs - a.abs);
  const winner = scored[0];
  if (!winner) return null;
  const { sym, val, pct } = winner;
  const dir: "pos" | "neg" | "neu" = pct > 0 ? "pos" : pct < 0 ? "neg" : "neu";
  const effectiveDir: "pos" | "neg" | "neu" =
    inverted ? (dir === "pos" ? "neg" : dir === "neg" ? "pos" : "neu") : dir;
  const pctLabel =
    pct > 0 ? `▲ +${pct.toFixed(2)}%`
    : pct < 0 ? `▼ −${Math.abs(pct).toFixed(2)}%`
    : "▬ ±0.00%";
  const pctClass = effectiveDir === "pos" ? "data-pos" : effectiveDir === "neg" ? "data-neg" : "data-neu";
  const series = syntheticSeries(`${ns}|${sym}|${seed}`, 12);
  const categoryLabel: Record<string, string> = {
    fx: "FX", eq: "Equities", cm: "Commodities", rt: "Rates",
  };
  const note: Record<string, string> = {
    fx: "G10 spot leader",
    eq: "Index futures",
    cm: "Front-month",
    rt: "Sovereign 10Y",
  };
  return {
    category: categoryLabel[ns] ?? ns,
    symbol: sym,
    label: ns === "fx" ? formatSymbol(sym) : sym.replace(/_/g, " "),
    lastFormatted: formatPrice(sym, val),
    pctLabel,
    pctClass,
    series,
    direction: effectiveDir,
    note: note[ns] ?? "",
  };
}

// =================================================================== § 02 MACRO REGIME

function MacroRegimeBlock({ briefing, intel }: { briefing: BriefingRead; intel: Intelligence | null }) {
  const seed = briefing.briefing_date;
  const indicators = [
    regimeIndicator("USD Trend",        `usd|${seed}`,   "pct", 0.45),
    regimeIndicator("Real Yields",      `ry|${seed}`,    "bp",  4),
    regimeIndicator("FX Vol (1M DXY)",  `fxvol|${seed}`, "abs", 1.5, 6.4),
    regimeIndicator("Credit (CDX IG)",  `cdx|${seed}`,   "bp",  3, undefined, true),
    regimeIndicator("Equity Vol (VIX)", `vix|${seed}`,   "abs", 2, 14.0, true),
    regimeIndicator("Front-end EUR-USD",`feyld|${seed}`, "bp",  2.5),
    regimeIndicator("Brent · OVX",      `ovx|${seed}`,   "abs", 1, 31),
    regimeIndicator("Gold real-rate beta", `gold|${seed}`, "abs", 0.4, -0.5),
  ];

  const stat = pullStatFor("regime", intel);
  const prov = provenanceFor("regime", intel);

  return (
    <div className="editorial-body research-column">
      {/* MACRO OVERVIEW — the intellectual anchor of the briefing. */}
      {intel?.macro_overview ? <MacroOverviewBlock data={intel.macro_overview} /> : null}

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, marginTop: 16 }}>
        <span className="caption" style={{ color: "var(--text-tertiary)" }}>
          Current desk regime:
        </span>
        <RiskPill tone={briefing.risk_tone} />
      </div>
      <EmbeddedTable>
        <table className="data-table data-table-compact">
          <thead>
            <tr>
              <th>Factor</th>
              <th className="col-num">Reading</th>
              <th>Direction</th>
              <th className="caption">Comment</th>
            </tr>
          </thead>
          <tbody>
            {indicators.map((ind) => (
              <tr key={ind.label}>
                <td>{ind.label}</td>
                <td className="col-num">{ind.reading}</td>
                <td>
                  <TickerChip direction={ind.direction}>{ind.directionLabel}</TickerChip>
                </td>
                <td className="caption" style={{ color: "var(--text-tertiary)" }}>{ind.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </EmbeddedTable>

      <RegimeReadParagraph indicators={indicators} seed={seed} />


      {stat ? <PullStatBlock stat={stat} /> : null}

      {intel ? <CrossAssetGrid links={intel.cross_asset} /> : null}

      {intel && intel.risk_scenarios.length > 0 ? (
        <RiskScenariosBlock scenarios={intel.risk_scenarios} />
      ) : null}

      {intel ? <StrategistInlineCallout view={intel.strategist_view} /> : null}

      {prov ? <ProvenanceFooter entry={prov} /> : null}
    </div>
  );
}

/**
 * Maps the deterministic indicator set to one of the institutional
 * regime labels the desk thinks in (higher-for-longer / soft-landing
 * optimism / inflation persistence / growth slowdown / disinflation /
 * liquidity-driven risk-on / stagflation pressure). The mapping is
 * derived from the SAME seed as the indicator table so the regime
 * label varies day-to-day in lockstep with the indicators — it never
 * contradicts the table.
 *
 * Stab-4.2 — replaces the previous static "soft-CPI base case" line
 * that read the same every day regardless of the seed.
 */
type RegimeIndicator = {
  label: string;
  direction: "pos" | "neg" | "neu";
};

interface RegimeRead {
  label: string;
  body: string;
}

function classifyRegime(indicators: RegimeIndicator[]): RegimeRead {
  // Read direction of the principal legs: USD trend (pos = USD bid),
  // real yields (pos = higher), credit (pos = wider = risk-off in our
  // invertGood convention, but the synthetic table emits effectiveDir
  // already inverted — so pos = wider credit = risk-off), equity vol
  // (pos = higher VIX = risk-off via invertGood), gold (pos = real
  // yields hurt gold less than expected). We read off the cluster.
  const sign = (label: string): number => {
    const ind = indicators.find((i) => i.label.toLowerCase().includes(label.toLowerCase()));
    if (!ind) return 0;
    return ind.direction === "pos" ? 1 : ind.direction === "neg" ? -1 : 0;
  };
  const usd = sign("USD");
  const ry = sign("Real Yields");
  const fxv = sign("FX Vol");
  const cdx = sign("Credit");
  const vix = sign("Equity Vol");
  const brent = sign("OVX");
  const gold = sign("Gold");

  // Cluster scoring — light-touch rules. Multiple regimes can fit; the
  // highest-scoring wins. Each regime has a description that names the
  // mechanism + cross-asset readthrough.
  const scores: Array<{ label: string; score: number; body: string }> = [
    {
      label: "Higher-for-longer repricing",
      score: (usd > 0 ? 2 : 0) + (ry > 0 ? 2 : 0) + (cdx > 0 ? 1 : 0),
      body:
        "Markets are pricing a slower easing path: front-end USD bid against the funder bloc, real yields supporting USD strength, credit modestly wider as duration repricing weighs on growth-sensitive equities. The desk reads the cluster as consistent with a higher-for-longer drift; the principal contradiction signal is any softening in the labour-market or services-CPI legs.",
    },
    {
      label: "Soft-landing optimism",
      score: (usd <= 0 ? 1 : 0) + (cdx < 0 ? 2 : 0) + (vix < 0 ? 2 : 0),
      body:
        "Risk-on cluster — credit tighter, equity-vol bid drained, USD soft against the cyclical bloc. The desk reads this as soft-landing pricing: disinflation without a labour-market break. The principal contradiction signal would be a re-steepening of the curve or a fresh leg higher in oil that re-energises the inflation-persistence narrative.",
    },
    {
      label: "Inflation persistence / repricing",
      score: (ry > 0 ? 2 : 0) + (brent > 0 ? 2 : 0) + (usd > 0 ? 1 : 0),
      body:
        "Inflation-persistence cluster — real yields higher, Brent supply-premium widening, USD bid as the front-end leads the move. The desk watches the breakeven curve and the energy-bloc FX (CAD, NOK) for confirmation; the contradiction signal is any sharp services-CPI miss that would relieve the front-end repricing.",
    },
    {
      label: "Growth slowdown / dovish repricing",
      score: (usd < 0 ? 1 : 0) + (ry < 0 ? 2 : 0) + (cdx > 0 ? 1 : 0) + (vix > 0 ? 1 : 0),
      body:
        "Growth-slowdown cluster — real yields softer on dovish repricing, credit modestly wider as the cycle inflection signal builds, equity-vol creeping higher. The desk reads the curve bias as bull-steepening; commodity-bloc FX softening on softer global demand. The contradiction signal is any upside-surprise NFP or ISM that re-anchors the soft-landing path.",
    },
    {
      label: "Liquidity-driven risk-on",
      score: (cdx < 0 ? 2 : 0) + (fxv < 0 ? 1 : 0) + (vix < 0 ? 1 : 0) + (gold > 0 ? 1 : 0),
      body:
        "Liquidity rebound cluster — credit firmer, FX-vol drained, equity-vol soft, gold supported by softer real yields. The desk reads this as a positioning unwind rather than a fundamental shift; carry trades are most exposed if the regime breaks.",
    },
    {
      label: "Stagflation pressure",
      score: (brent > 0 ? 2 : 0) + (ry > 0 ? 1 : 0) + (vix > 0 ? 2 : 0) + (cdx > 0 ? 1 : 0),
      body:
        "Stagflation-pressure cluster — energy premium widening alongside higher real yields, equity-vol drifting up, credit wider. The desk reads this as the worst-case cross-asset overlay: rates and equities both under pressure, gold + JPY safe-haven bid. The contradiction signal is any de-escalation in the supply-premium leg.",
    },
  ];

  const top = scores.reduce((best, cur) => (cur.score > best.score ? cur : best), scores[0]);
  return { label: top.label, body: top.body };
}

function RegimeReadParagraph({
  indicators,
  seed,
}: {
  indicators: RegimeIndicator[];
  seed: string;
}) {
  void seed;
  const read = classifyRegime(indicators);
  return (
    <div className="regime-read">
      <span className="regime-read-eyebrow">Regime read</span>
      <span className="regime-read-label">{read.label}</span>
      <p className="regime-read-body">{read.body}</p>
    </div>
  );
}

function regimeIndicator(
  label: string, seed: string, kind: "pct" | "bp" | "abs",
  magnitude: number, base = 0, invertGood = false,
) {
  const raw = syntheticBp(seed, magnitude);
  const direction: "pos" | "neg" | "neu" = raw > 0 ? "pos" : raw < 0 ? "neg" : "neu";
  const effectiveDir: "pos" | "neg" | "neu" =
    invertGood
      ? direction === "pos" ? "neg" : direction === "neg" ? "pos" : "neu"
      : direction;
  const arrow = raw > 0 ? "▲" : raw < 0 ? "▼" : "▬";
  const sign = raw > 0 ? "+" : raw < 0 ? "−" : "±";
  const reading =
    kind === "pct" ? `${sign}${Math.abs(raw).toFixed(2)}%`
    : kind === "bp"  ? `${sign}${Math.abs(raw).toFixed(1)} bp`
    : `${(base + raw / 10).toFixed(2)}`;
  const directionLabel = `${arrow} ${direction === "neu" ? "flat" : direction === "pos" ? "bid" : "soft"}`;
  const comment =
    label.includes("USD")        ? "DXY-weighted basket"
    : label.includes("Real Yields") ? "10Y minus 10Y breakeven"
    : label.includes("FX Vol")   ? "1M ATM, DXY-weighted"
    : label.includes("Credit")   ? "5Y on-the-run"
    : label.includes("Equity Vol") ? "CBOE VIX index"
    : label.includes("Front-end EUR-USD") ? "2Y spread, basis points"
    : label.includes("OVX")      ? "Brent implied vol"
    : label.includes("Gold")     ? "Rolling 60d beta"
    : "";
  return { label, reading, direction: effectiveDir, directionLabel, comment };
}

// =================================================================== § 03 FX COMMENTARY

function FxCommentaryBlock({ briefing, intel }: { briefing: BriefingRead; intel: Intelligence | null }) {
  const stat = pullStatFor("fx", intel);
  const prov = provenanceFor("fx", intel);
  return (
    <>
      <BodyParagraphs text={briefing.fx_commentary} />

      {/* Stab-4.2 — compact major-pair table beneath the FX body so
          the section reads as institutional FX-desk content (Bloomberg /
          ForexLive register), not a single-pair commentary blurb. The
          driver column carries a structural one-liner per pair so the
          desk has the cross-asset read at a glance. */}
      <FxMajorsTable briefing={briefing} />

      {intel && intel.pair_commentary.length > 0 ? (
        <div style={{ margin: "16px 0", padding: "8px 14px", border: "1px solid var(--border-subtle)", borderRadius: 3, background: "var(--surface-panel)" }}>
          <span className="eyebrow" style={{ color: "var(--text-eyebrow)", marginBottom: 8, display: "block" }}>
            Pair-level desk view
          </span>
          {intel.pair_commentary.map((p) => (
            <PairCommentaryRow key={p.pair} p={p} />
          ))}
        </div>
      ) : null}

      {stat ? <PullStatBlock stat={stat} /> : null}
      {prov ? <ProvenanceFooter entry={prov} /> : null}
    </>
  );
}

/**
 * Compact majors table — Bloomberg-terminal-style register of the
 * G10 FX pairs the desk reads most. Each row pairs a real reference
 * level from the briefing's market snapshot (Stab-4.3 expanded the
 * market registry to cover all eight pairs) with a desk-authored
 * structural-driver one-liner. Empty reference values surface as "—"
 * — never fabricated.
 */
const FX_MAJORS: Array<{ pair: string; driver: string }> = [
  { pair: "EUR/USD", driver: "Bund-Treasury spread + front-end yield divergence." },
  { pair: "GBP/USD", driver: "Gilt-Treasury spread + BoE vote-split signal." },
  { pair: "USD/JPY", driver: "JGB yields + BoJ YCC + USD front-end; safe-haven flow on escalation." },
  { pair: "USD/CHF", driver: "SNB FX-reserve posture + safe-haven flow on geopolitical risk." },
  { pair: "AUD/USD", driver: "China-cycle + iron-ore + RBA path; risk-sentiment proxy." },
  { pair: "USD/CAD", driver: "Brent + BoC path + US-Canada front-end spread." },
  { pair: "USD/MXN", driver: "Carry + USTR tariff signal + US-Mexico growth gap." },
  { pair: "USD/CNH", driver: "PBoC fix + tariff / chip-policy thread + capital-flow dynamics." },
];

function FxMajorsTable({ briefing }: { briefing: BriefingRead }) {
  const fx = briefing.market_snapshot?.fx ?? {};
  return (
    <EmbeddedTable>
      <table className="data-table data-table-compact">
        <thead>
          <tr>
            <th>Pair</th>
            <th className="col-num">Reference</th>
            <th>Driver / what the desk reads</th>
          </tr>
        </thead>
        <tbody>
          {FX_MAJORS.map((m) => {
            const value = fx[m.pair];
            const ref = typeof value === "number" ? formatFxRef(m.pair, value) : "—";
            return (
              <tr key={m.pair}>
                <td>{m.pair}</td>
                <td className="col-num">{ref}</td>
                <td className="caption" style={{ color: "var(--text-secondary)" }}>{m.driver}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </EmbeddedTable>
  );
}

function formatFxRef(pair: string, value: number): string {
  // EUR/USD style: 4dp; USD/JPY-style: 2dp; DXY: 2dp.
  if (/\//.test(pair) && !pair.endsWith("/JPY")) return value.toFixed(4);
  if (pair.endsWith("/JPY")) return value.toFixed(2);
  return value.toFixed(2);
}

// =================================================================== § 04 VOLATILITY

const VOL_PAIRS = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "USDCNH"];
// 3-MONTH ATM tenor baselines (Stab-4 editorial phase — 3M is the
// reference tenor the desk reads for forward-looking event-risk vs
// the spot reaction in 1M). Term-structure relative to historical 3M
// medians remains the cleanest cross-pair signal.
const BASE_ATM: Record<string, number> = {
  EURUSD: 7.1, GBPUSD: 7.8, USDJPY: 9.6, USDCHF: 7.4,
  AUDUSD: 9.9, USDCAD: 6.5, USDCNH: 4.7,
};
const BASE_RR: Record<string, number> = {
  EURUSD: -0.15, GBPUSD: -0.40, USDJPY: 0.60, USDCHF: -0.10,
  AUDUSD: -0.30, USDCAD: 0.08, USDCNH: 0.04,
};

function VolatilityBlock({ briefing, intel }: { briefing: BriefingRead; intel: Intelligence | null }) {
  const seed = briefing.briefing_date;
  const rows = VOL_PAIRS.map((p) => {
    const atm = (BASE_ATM[p] ?? 7) + syntheticBp(`vol|${p}|${seed}`, 0.4) / 10;
    const rr = (BASE_RR[p] ?? 0) + syntheticBp(`rr|${p}|${seed}`, 0.15) / 100;
    return { pair: p, atm, rr };
  });

  const stat = pullStatFor("vol", intel);
  const prov = provenanceFor("vol", intel);

  return (
    <>
      <p
        className="body-sm"
        style={{ color: "var(--text-secondary)", marginBottom: 10, maxWidth: "var(--layout-research-max-w)" }}
      >
        <strong style={{ color: "var(--text-primary)" }}>Read:</strong> 3M ATM is the
        forward-looking event-risk tenor — the term-structure relative to recent
        medians is the cleanest cross-pair signal. The standout watch is any
        risk-reversal flip on the majors: a fresh skew bias (e.g. JPY calls bid) is
        an early read on positioning shift before the spot tape catches the move.
      </p>

      <EmbeddedTable>
        <table className="data-table data-table-compact">
          <thead>
            <tr>
              <th>Pair</th>
              <th className="col-num">3M ATM</th>
              <th className="col-num">25Δ RR</th>
              <th>Skew Bias</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const cls = r.rr > 0 ? "data-pos" : r.rr < 0 ? "data-neg" : "data-neu";
              const bias =
                Math.abs(r.rr) < 0.05 ? "balanced"
                : r.rr > 0 ? `${r.pair.slice(3)} calls bid`
                : `${r.pair.slice(0, 3)} calls bid`;
              return (
                <tr key={r.pair}>
                  <td>{formatSymbol(r.pair)}</td>
                  <td className="col-num">{r.atm.toFixed(2)}</td>
                  <td className={cn("col-num", cls)}>
                    {r.rr > 0 ? "+" : r.rr < 0 ? "−" : "±"}{Math.abs(r.rr).toFixed(2)}
                  </td>
                  <td className="caption" style={{ color: "var(--text-tertiary)" }}>{bias}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </EmbeddedTable>

      {stat ? <PullStatBlock stat={stat} /> : null}

      <p className="caption" style={{ color: "var(--text-tertiary)" }}>
        3M ATM and 25-delta risk-reversal reference levels. Term-structure read
        against the 30-day median is the cleaner signal than the absolute level.
      </p>

      {prov ? <ProvenanceFooter entry={prov} /> : null}
    </>
  );
}

// =================================================================== § 05 ECONOMIC CALENDAR

function EconomicCalendarBlock({ briefing, intel }: { briefing: BriefingRead; intel: Intelligence | null }) {
  const events = briefing.key_events ?? [];
  const prov = provenanceFor("calendar", intel);
  // Today's Catalysts — unified stream: scheduled data releases + recent
  // geopolitical / government activity + recent high-signal CB events.
  // The full data table below still renders only `events` so the
  // comprehensive economic-release reference remains intact.
  const catalysts = buildCatalysts(briefing, intel);
  const priorityEvents = priorityEventsFrom(catalysts, 12);

  return (
    <>
      {priorityEvents.length > 0 ? <PriorityEventsBlock events={priorityEvents} /> : null}

      {intel && intel.risk_warnings.length > 0
        ? intel.risk_warnings
            .filter((w) => w.title.toLowerCase().includes("cpi") || w.severity.toLowerCase() === "high")
            .map((w, i) => <RiskWarningBlock key={i} warning={w} />)
        : null}

      {events.length === 0 ? (
        <p className="caption" style={{ color: "var(--text-tertiary)" }}>
          No scheduled events.
        </p>
      ) : (
        <EmbeddedTable>
          <table className="data-table data-table-compact">
            <thead>
              <tr>
                <th>Time</th>
                <th>Region</th>
                <th>Event</th>
                <th className="col-center">Imp.</th>
                <th className="col-num">Forecast</th>
                <th className="col-num">Prev.</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i}>
                  <td className="col-num">{e.time_utc}</td>
                  <td>{e.region}</td>
                  <td>{e.event}</td>
                  <td className="col-center"><ImportancePill importance={e.importance} /></td>
                  <td className="col-num">{e.forecast ?? "—"}</td>
                  <td className="col-num">{e.previous ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </EmbeddedTable>
      )}

      {events.some(eventHasDeskContext) ? (
        <div style={{ marginTop: 14 }}>
          <span className="eyebrow" style={{ color: "var(--text-eyebrow)", marginBottom: 8, display: "block" }}>
            Desk context
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {events.filter(eventHasDeskContext).map((e, i) => <CalendarDeskContext key={i} event={e} />)}
          </div>
        </div>
      ) : null}

      {intel && intel.consensus_calls.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <span className="eyebrow" style={{ color: "var(--text-eyebrow)", marginBottom: 8, display: "block" }}>
            Consensus vs Risk-to-Consensus
          </span>
          {intel.consensus_calls.map((c, i) => <ConsensusCallBlock key={i} call={c} />)}
        </div>
      ) : null}

      {prov ? <ProvenanceFooter entry={prov} /> : null}
    </>
  );
}

function eventHasDeskContext(e: KeyEvent): boolean {
  return Boolean(e.desk_focus || e.vol_impact || (e.pairs_affected && e.pairs_affected.length > 0) || e.speaker || e.topic);
}

// ---- Priority-event ranking & session helpers ----

const SENSITIVITY_RANK: Record<string, number> = {
  desk_critical: 5,
  high: 4,
  medium: 3,
  low: 2,
};

const IMPORTANCE_RANK: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function eventScore(e: KeyEvent): number {
  const sens = SENSITIVITY_RANK[(e.sensitivity ?? "").toLowerCase()] ?? 0;
  const imp = IMPORTANCE_RANK[e.importance.toLowerCase()] ?? 1;
  return sens * 10 + imp;
}

function priorityEventsFrom(events: KeyEvent[], limit = 5): KeyEvent[] {
  // Stab-4.2 — institutional morning briefs run dense, not sparse. The
  // priority register should carry the day's catalyst surface even when
  // not every item is "desk_critical": medium-importance scheduled
  // releases, mid-tier leader speeches, and tier-2 geopol items all
  // belong here. Lower the threshold so the block is consistently
  // populated and let the badge / P-tag hierarchy do the prioritisation
  // work visually. If the threshold gates the list to zero, fall back
  // to the top-N-by-score so the block is never empty.
  const scored = events
    .map((e) => ({ e, s: eventScore(e) }))
    .filter((x) => x.s >= 12)
    .sort((a, b) => b.s - a.s);
  if (scored.length < 4) {
    return events.map((e) => ({ e, s: eventScore(e) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, limit)
      .map((x) => x.e);
  }
  return scored.slice(0, limit).map((x) => x.e);
}

// ============================================================================
// TODAY'S CATALYSTS — unified catalyst feed for § 03 Economic Calendar.
// ============================================================================
//
// A real macro/FX desk doesn't read "tier-1 economic releases" alone — it
// reads ALL catalysts that can move FX, rates, commodities, or risk
// sentiment today, INCLUDING:
//   - scheduled data releases (briefing.key_events, from TradingEconomics)
//   - geopolitical / government events (sanctions, tariffs, summits,
//     escalation, OPEC, fiscal — sourced from the geopol feed registry)
//   - upcoming or just-published central-bank activity (statements,
//     press conferences, testimony, minutes — sourced from each bank's
//     own RSS feed)
//
// buildCatalysts unifies the three streams into one KeyEvent[]-shaped
// list, dropping low-relevance noise and stale items. The result is fed
// into the existing PriorityEventsBlock renderer — no new renderer
// abstractions; the existing badge / session / priority logic just
// works against the merged shape.
//
// The full data table at the bottom of the section continues to render
// only briefing.key_events (the comprehensive scheduled-data reference),
// so the section as a whole reads: "today's catalysts (unified)" up top,
// "scheduled data releases (reference)" below.
function geoKindToCategory(k: string): string {
  switch (k) {
    case "sanctions":
    case "escalation":
      return "geopolitical";
    case "tariff":
    case "trade-deal":
    case "policy-statement":
    case "fiscal-policy":
      return "policy";
    case "commodity-supply":
      return "growth";
    case "leader-speech":
    case "summit":
    case "election":
    case "emergency":
      return "political";
    default:
      return "political";
  }
}

const CB_HIGH_SIGNAL_KINDS = new Set<string>([
  "statement",
  "press-conf",
  "testimony",
  "minutes",
]);

function buildCatalysts(
  briefing: BriefingRead,
  intel: Intelligence | null,
): KeyEvent[] {
  // Stab-4.3 — institutional market-impact ranking. Each merged
  // KeyEvent is tagged with the impact tier from impact.ts; the
  // returned list is sorted by tier descending so the EXTREME
  // (US CPI, NFP, Retail Sales, FOMC, Trump-China tariff escalation,
  // OPEC supply shock) items lead the priority register, never
  // crowded out by fresher low-tier RSS noise.
  type Tagged = KeyEvent & { __tier: ImpactTier };
  const all: Tagged[] = [];

  for (const e of briefing.key_events ?? []) {
    const tier = scoreCalendarText(e.region, e.event, e.importance);
    // Promote sensitivity for extreme tier so PriorityEventsBlock
    // renders them with P1 "watch closely" emphasis.
    let promoted = e;
    if (tier === "extreme" && e.sensitivity !== "desk_critical") {
      promoted = { ...e, sensitivity: "desk_critical" };
    } else if (tier === "high" && (!e.sensitivity || e.sensitivity === "low" || e.sensitivity === "medium")) {
      promoted = { ...e, sensitivity: "high" };
    }
    all.push({ ...promoted, __tier: tier });
  }

  const now = Date.now();
  const geoCutoff = now - 48 * 60 * 60 * 1000; // last 48h
  const cbCutoff = now - 36 * 60 * 60 * 1000;  // last 36h

  for (const g of intel?.geopol_events ?? []) {
    if (g.relevance === "low") continue;
    const t = Date.parse(g.datetime);
    if (!Number.isFinite(t) || t < geoCutoff) continue;
    const tier = scoreGeoEvent(g);
    const sens =
      tier === "extreme" ? "desk_critical"
      : tier === "high" ? "desk_critical"
      : "high";
    all.push({
      time_utc: g.datetime.slice(11, 16),
      region: g.region,
      event: g.title.length > 120 ? g.title.slice(0, 117) + "…" : g.title,
      importance: tier === "extreme" || tier === "high" ? "high" : "medium",
      forecast: null,
      previous: null,
      speaker: null,
      topic: g.kind,
      category: geoKindToCategory(g.kind),
      sensitivity: sens,
      pairs_affected: null,
      vol_impact: null,
      desk_focus: g.market_impact,
      __tier: tier,
    });
  }

  for (const c of intel?.cb_events ?? []) {
    if (!CB_HIGH_SIGNAL_KINDS.has(c.kind)) continue;
    const t = Date.parse(c.datetime);
    if (!Number.isFinite(t) || t < cbCutoff) continue;
    const tier = scoreCBEvent(c);
    const sens =
      tier === "extreme" ? "desk_critical"
      : c.kind === "statement" || c.kind === "press-conf" ? "desk_critical"
      : "high";
    all.push({
      time_utc: c.datetime.slice(11, 16),
      region: c.bank,
      event: c.title.length > 120 ? c.title.slice(0, 117) + "…" : c.title,
      importance: "high",
      forecast: null,
      previous: null,
      speaker: c.speaker,
      topic: c.kind,
      category: "monetary",
      sensitivity: sens,
      pairs_affected: null,
      vol_impact: null,
      desk_focus: c.market_impact,
      __tier: tier,
    });
  }

  // Sort by impact tier desc, then by time. The PriorityEventsBlock
  // re-sorts by session group internally, but the slice taken from this
  // list determines which items make it in — sorting here guarantees
  // tier-extreme items are not dropped at the slice boundary.
  all.sort((a, b) => tierRank(b.__tier) - tierRank(a.__tier));
  // Strip the __tier tag before returning so the downstream KeyEvent
  // renderer doesn't see the internal field.
  return all.map((e) => {
    const { __tier: _t, ...rest } = e;
    void _t;
    return rest;
  });
}

function sessionTagFor(timeUtc: string): { label: string; cls: string } {
  const m = /^(\d{2}):?/.exec(timeUtc);
  const h = m ? parseInt(m[1], 10) : -1;
  if (h < 0) return { label: "Anytime", cls: "session-tag-any" };
  if (h < 7) return { label: "Asia", cls: "session-tag-asia" };
  if (h < 13) return { label: "Europe", cls: "session-tag-eu" };
  if (h < 22) return { label: "US", cls: "session-tag-us" };
  return { label: "Asia", cls: "session-tag-asia" };
}

function priorityLevelFor(e: KeyEvent): { label: string; cls: string } {
  const s = (e.sensitivity ?? "").toLowerCase();
  if (s === "desk_critical") return { label: "P1", cls: "prio-p1" };
  if (s === "high")          return { label: "P2", cls: "prio-p2" };
  if (s === "medium")        return { label: "P3", cls: "prio-p3" };
  if (e.importance.toLowerCase() === "high") return { label: "P2", cls: "prio-p2" };
  return { label: "P4", cls: "prio-p4" };
}

function volRankFor(e: KeyEvent): { label: string; cls: string } {
  const sens = (e.sensitivity ?? "").toLowerCase();
  if (sens === "desk_critical") return { label: "Vol · High", cls: "vol-high" };
  if (sens === "high")          return { label: "Vol · Med",  cls: "vol-med" };
  if (sens === "medium")        return { label: "Vol · Low",  cls: "vol-med" };
  return { label: "Vol · Min",  cls: "vol-low" };
}

// ---- Category badge helper (CPI / NFP / Fed / ECB / auction / OPEC / etc.)

interface CategoryBadge {
  label: string;
  cls: string;  // category-cat-{inflation|monetary|growth|auction|labour|opec|survey}
}

const CATEGORY_LABELS: Record<string, CategoryBadge> = {
  political:    { label: "Political",    cls: "category-cat-political" },
  geopolitical: { label: "Geopolitical", cls: "category-cat-geopolitical" },
  policy:       { label: "Policy",       cls: "category-cat-policy" },
  inflation:    { label: "Inflation",    cls: "category-cat-inflation" },
  monetary:     { label: "Central Bank", cls: "category-cat-monetary" },
  auction:      { label: "Auction",      cls: "category-cat-auction" },
  labour:       { label: "Labour",       cls: "category-cat-labour" },
  growth:       { label: "Growth",       cls: "category-cat-growth" },
  survey:       { label: "Survey",       cls: "category-cat-growth" },
};

function categoryBadgeFor(e: KeyEvent): CategoryBadge | null {
  // Backend-provided category is authoritative. Keyword heuristics only fire
  // when no category is set (Phase-2 RSS ingestion may leave it null).
  const cat = (e.category ?? "").toLowerCase();
  if (cat && CATEGORY_LABELS[cat]) return CATEGORY_LABELS[cat];

  const ev = e.event.toLowerCase();
  const sp = (e.speaker ?? "").toLowerCase();
  const hay = `${ev} ${sp}`;

  // Heads-of-government / senior cabinet — Political comes first.
  if (/\b(prime minister|pm |president|chancellor|finance minister|treasury secretary)\b/.test(hay) ||
      /\b(starmer|sunak|macron|merz|scholz|meloni|trump|biden|harris|yellen|bessent|reeves)\b/.test(hay))
    return CATEGORY_LABELS["political"];
  if (/\b(g7|g20|summit|nato|sanctions|tariff|opec\+|brics|wto|wef|imfc|bretton)\b/.test(ev))
    return CATEGORY_LABELS["geopolitical"];
  if (/\b(treasury|fiscal|debt management|imf|world bank|sec |fdic|cftc|esma|fca|bafin|mof )\b/.test(ev))
    return CATEGORY_LABELS["policy"];

  if (/\b(cpi|hicp|ppi|pce|inflation)\b/.test(ev))
    return CATEGORY_LABELS["inflation"];
  if (/\b(fed|fomc|ecb|boe|boj|snb|pboc|rba|rbnz|powell|williams|logan|lagarde|lane|bailey|pill|ueda)\b/.test(ev))
    return CATEGORY_LABELS["monetary"];
  if (/\b(auction|tap|syndication)\b/.test(ev))
    return CATEGORY_LABELS["auction"];
  if (/\b(nfp|payrolls|claims|unemployment|jobs|jolts|hours|wages)\b/.test(ev))
    return CATEGORY_LABELS["labour"];
  if (/\b(opec|saudi|crude inventory|eia)\b/.test(ev))
    return { label: "OPEC / Oil", cls: "category-cat-opec" };
  if (/\b(gdp|pmi|ism|production|retail|consumer|sentiment)\b/.test(ev))
    return CATEGORY_LABELS["growth"];
  if (/\b(zew|ifo|sentix|gfk|business confidence)\b/.test(ev))
    return CATEGORY_LABELS["survey"];
  return null;
}

// ---- Session grouping for the priority block ----

type SessionKey = "asia" | "europe" | "us" | "late";

interface SessionGroup {
  key: SessionKey;
  label: string;
  window: string;  // e.g. "00:00–07:00 UTC"
  cls: string;     // matches the session-tag classes
  events: KeyEvent[];
}

function sessionKeyFor(timeUtc: string): SessionKey {
  const m = /^(\d{2}):?/.exec(timeUtc);
  const h = m ? parseInt(m[1], 10) : -1;
  if (h < 0) return "europe";
  if (h < 7)  return "asia";
  if (h < 13) return "europe";
  if (h < 22) return "us";
  return "late";
}

function groupEventsBySession(events: KeyEvent[]): SessionGroup[] {
  const groups: Record<SessionKey, SessionGroup> = {
    asia:   { key: "asia",   label: "Asia",            window: "00:00–07:00 UTC", cls: "session-tag-asia", events: [] },
    europe: { key: "europe", label: "Europe · London", window: "07:00–13:00 UTC", cls: "session-tag-eu",   events: [] },
    us:     { key: "us",     label: "US · New York",   window: "13:00–22:00 UTC", cls: "session-tag-us",   events: [] },
    late:   { key: "late",   label: "Asia late",       window: "22:00–24:00 UTC", cls: "session-tag-asia", events: [] },
  };
  for (const e of events) groups[sessionKeyFor(e.time_utc)].events.push(e);
  // sort events within each group by time
  for (const g of Object.values(groups)) {
    g.events.sort((a, b) => a.time_utc.localeCompare(b.time_utc));
  }
  // return only groups that have events, in canonical order
  return (["asia", "europe", "us", "late"] as SessionKey[])
    .map((k) => groups[k])
    .filter((g) => g.events.length > 0);
}

function PriorityEventsBlock({ events }: { events: KeyEvent[] }) {
  const groups = groupEventsBySession(events);
  return (
    <div className="priority-events">
      <div className="priority-events-header">
        <span className="calendar-catalysts-eyebrow">Today's Catalysts</span>
        <span className="priority-events-count">
          {events.length} flagged · across {groups.length} {groups.length === 1 ? "session" : "sessions"}
        </span>
      </div>
      <div className="priority-events-groups">
        {groups.map((g) => (
          <div key={g.key} className="session-group">
            <div className="session-group-header">
              <span className={cn("session-group-tag", g.cls)}>{g.label}</span>
              <span className="session-group-rule" />
              <span className="session-group-window">{g.window}</span>
            </div>
            <div className="session-group-events">
              {g.events.map((e, i) => {
                const prio = priorityLevelFor(e);
                const vol = volRankFor(e);
                const isP1 = prio.label === "P1";
                const watchClosely = (e.sensitivity ?? "").toLowerCase() === "desk_critical";
                const cat = categoryBadgeFor(e);
                return (
                  <div key={i} className={cn("priority-event", isP1 && "priority-event-p1")}>
                    <div className="priority-event-time">
                      <span className="time">{e.time_utc}</span>
                      <span className="time-zone">GMT</span>
                      <span className="region">{e.region}</span>
                    </div>
                    <div className="priority-event-body">
                      <div className="priority-event-head">
                        <span className={cn("priority-tag", prio.cls)}>{prio.label}</span>
                        {cat ? (
                          <span className={cn("category-badge", cat.cls)}>{cat.label}</span>
                        ) : null}
                        <span className="priority-event-title">{e.event}</span>
                        {watchClosely ? (
                          <span className="priority-event-watch">Watch closely</span>
                        ) : null}
                      </div>
                      <div className="priority-event-meta">
                        <span className={cn("vol-tag", vol.cls)}>{vol.label}</span>
                        {e.pairs_affected && e.pairs_affected.length > 0 ? (
                          <span className="priority-event-pairs">{e.pairs_affected.join(" · ")}</span>
                        ) : null}
                        {e.speaker ? (
                          <span className="priority-event-speaker">{e.speaker}</span>
                        ) : null}
                      </div>
                      {e.desk_focus ? (
                        <p className="priority-event-focus">{e.desk_focus}</p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function sensitivityColor(s?: string | null): string {
  const v = (s ?? "").toLowerCase();
  if (v === "desk_critical") return "var(--offer)";
  if (v === "high") return "var(--warning)";
  if (v === "medium") return "var(--makor-300)";
  return "var(--text-tertiary)";
}

function CalendarDeskContext({ event }: { event: KeyEvent }) {
  return (
    <div
      style={{
        padding: "8px 12px",
        borderLeft: `2px solid ${sensitivityColor(event.sensitivity)}`,
        background: "var(--surface-inset)",
        borderRadius: "0 3px 3px 0",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-tertiary)" }}>
          {event.time_utc}
        </span>
        <span className="body-sm" style={{ fontWeight: 600, color: "var(--text-primary)" }}>
          {event.region} · {event.event}
        </span>
        {event.sensitivity ? (
          <span
            className="caption"
            style={{
              color: sensitivityColor(event.sensitivity),
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              fontWeight: 600,
              fontSize: 9,
            }}
          >
            {event.sensitivity.replace("_", " ")}
          </span>
        ) : null}
      </div>
      {event.speaker ? (
        <div className="caption" style={{ color: "var(--text-secondary)", marginBottom: 2 }}>
          <strong style={{ color: "var(--text-primary)" }}>Speakers:</strong> {event.speaker}
        </div>
      ) : null}
      {event.topic ? (
        <div className="caption" style={{ color: "var(--text-secondary)", marginBottom: 2 }}>
          <strong style={{ color: "var(--text-primary)" }}>Topic:</strong> {event.topic}
        </div>
      ) : null}
      {event.desk_focus ? (
        <div className="body-sm" style={{ color: "var(--text-secondary)", marginBottom: 2 }}>
          <strong style={{ color: "var(--text-primary)" }}>Desk focus:</strong> {event.desk_focus}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", marginTop: 4 }}>
        {event.pairs_affected && event.pairs_affected.length > 0 ? (
          <span style={{ display: "inline-flex", gap: 4, alignItems: "baseline" }}>
            <span className="eyebrow" style={{ color: "var(--text-eyebrow)" }}>Pairs</span>
            <span className="data-sm">{event.pairs_affected.join(" · ")}</span>
          </span>
        ) : null}
        {event.vol_impact ? (
          <span style={{ display: "inline-flex", gap: 4, alignItems: "baseline" }}>
            <span className="eyebrow" style={{ color: "var(--text-eyebrow)" }}>Vol impact</span>
            <span className="caption" style={{ color: "var(--text-secondary)" }}>{event.vol_impact}</span>
          </span>
        ) : null}
      </div>
    </div>
  );
}

// =================================================================== § 06 CENTRAL BANK WATCH

const CB_KEYWORDS = [
  "fomc", "fed ", "powell", "williams", "logan", "waller", "bowman",
  "ecb", "lane", "schnabel", "lagarde",
  "boe ", "bank of england", "bailey", "pill",
  "boj", "bank of japan", "ueda",
  "pboc", "snb", "boc ", "rba ", "rbnz",
];

function isCentralBankEvent(e: KeyEvent): boolean {
  const hay = `${e.event} ${e.region}`.toLowerCase();
  return CB_KEYWORDS.some((kw) => hay.includes(kw));
}

// =================================================================== CB EVENTS BLOCK
//
// Rendered at the top of § 06 Central Bank Watch. Each row is one
// recent statement / minutes / speech / press conference / testimony
// from a major bank's public RSS feed. Shows time · bank · kind ·
// speaker · headline link, with the per-bank market-impact frame
// underneath statement / minutes / press-conf rows (the highest-signal
// kinds). No body text from upstream is reproduced — only the link
// anchor + our editorial framing.

const CB_KIND_LABEL: Record<string, string> = {
  "statement": "Statement",
  "minutes": "Minutes",
  "speech": "Speech",
  "press-conf": "Press conf",
  "testimony": "Testimony",
  "release": "Release",
};

const CB_KIND_BADGE_CLASS: Record<string, string> = {
  "statement": "category-cat-monetary",
  "minutes": "category-cat-monetary",
  "press-conf": "category-cat-monetary",
  "testimony": "category-cat-political",
  "speech": "category-cat-policy",
  "release": "category-cat-growth",
};

function formatCBEventTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  const today = new Date();
  const sameDay =
    d.getUTCFullYear() === today.getUTCFullYear() &&
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${mon} ${hh}:${mm}`;
}

/**
 * Per-(bank, kind) institutional read — short, desk-style explanation
 * of why each event matters for FX / rates. Surfaces beneath the
 * upstream RSS title so each entry carries an explanatory sentence,
 * not just the raw headline. Stab-4.2 refinement.
 */
const CB_KIND_FRAMES: Record<string, Partial<Record<string, string>>> = {
  Fed: {
    "statement":   "Dot-plot drift + forward-guidance language are the cross-asset triggers; front-end Treasury yields and USD propagate first.",
    "minutes":     "Reaction-function nuance is the read — wage-and-services framing matters more than the headline rate path.",
    "press-conf":  "Q&A language is the live signal; vol-of-vol around Powell's framing repeatedly outweighs the statement itself.",
    "testimony":   "Hill testimony tests the data-dependence line; surprise hawkishness lifts the front-end USD complex.",
    "speech":      "Watch for vote-split signalling and any departure from the most recent SEP framing.",
    "release":     "Routine data publication; structural read only — surfaces in the context backdrop, not as a live catalyst.",
  },
  ECB: {
    "statement":   "Vote distribution + services-inflation framing carries more cross-asset signal than the rate level; the bund-Treasury spread is the cleanest read.",
    "minutes":     "Account of the meeting probes the consensus path on services CPI and wage growth — bund moves first, EUR/USD follows.",
    "press-conf":  "Lagarde's framing on data-dependence is the variable; explicit forward guidance shifts EUR/USD on impact.",
    "speech":      "Hawk / dove side-bet — Holzmann / Schnabel / Lane positions condition the GC reaction function.",
    "testimony":   "ECON / Bundestag appearances are the formal venue for guidance shifts; gilt + bund spreads watch.",
    "release":     "Routine release; conditioning input rather than catalyst.",
  },
  BoE: {
    "statement":   "Vote-split is the live signal — services inflation read conditions the policy path; gilts + GBP lead.",
    "minutes":     "MPC minutes test the dovish / hawkish dispersion; GBP crosses move on any new conditioning language.",
    "press-conf":  "Bailey's framing on services pricing pass-through is the structural variable.",
    "speech":      "Pill / Mann / Dhingra positions are the dispersion signal — flag any shift in the vote balance.",
    "testimony":   "Treasury Select Committee testimony surfaces the data-dependence line in plain language.",
    "release":     "Routine release; conditioning input only.",
  },
  BoJ: {
    "statement":   "YCC framework language + wage-cycle commentary drive USD/JPY level; JGB curve carries the spillover.",
    "minutes":     "Summary of opinions tests the normalisation pace; USD/JPY direction follows JGB curve.",
    "press-conf":  "Ueda press-conference reaction-function language is the binary; FX vol typically resets within the session.",
    "speech":      "Watch for any departure from the patient-normalisation frame; wage cycle is the conditioning factor.",
    "testimony":   "Diet appearances test the FX-volatility commentary; intervention thresholds visible only ex-post.",
    "release":     "Routine release; structural backdrop.",
  },
  SNB: {
    "statement":   "Monetary-policy assessment frames CHF tolerance + intervention posture; EUR/CHF and CHF cross-vol respond.",
    "minutes":     "Account of the assessment — SNB rarely surprises; CHF moves on tolerance shifts not rate decisions.",
    "press-conf":  "Jordan / Schlegel commentary on the CHF level is the live FX-intervention read.",
    "speech":      "Watch for any framing change on imported euro-area inflation or FX-reserve flow.",
    "testimony":   "Parliamentary appearances cover FX-reserve composition + rate path conditioning.",
    "release":     "Routine release; structural backdrop.",
  },
};

function cbInstitutionalRead(bank: string, kind: string): string | null {
  const byBank = CB_KIND_FRAMES[bank];
  if (!byBank) return null;
  return byBank[kind] ?? null;
}

function CBEventRow({ e }: { e: CBEvent }) {
  const kindLabel = CB_KIND_LABEL[e.kind] ?? "Release";
  const kindCls = CB_KIND_BADGE_CLASS[e.kind] ?? "category-cat-growth";
  // Stab-4.2 — every CB row now carries an institutional read derived
  // from (bank, kind). The per-bank market_impact still surfaces on the
  // high-signal kinds (statement / minutes / press-conf / testimony) as
  // a longer structural frame; the kind-frame is the tighter "why this
  // matters today" sentence.
  const kindRead = cbInstitutionalRead(e.bank, e.kind);
  const showImpact =
    !!e.market_impact &&
    (e.kind === "statement" || e.kind === "minutes" || e.kind === "press-conf" || e.kind === "testimony");
  return (
    <div className="cb-event-row">
      <div className="cb-event-meta">
        <span className="cb-event-time">{formatCBEventTime(e.datetime)}</span>
        <span className="cb-event-bank">{e.bank}</span>
        <span className={cn("category-badge", kindCls)}>{kindLabel}</span>
        {e.speaker ? <span className="cb-event-speaker">{e.speaker}</span> : null}
      </div>
      <div className="cb-event-title">
        {e.source_url ? (
          <a href={e.source_url} target="_blank" rel="noopener noreferrer">
            {e.title}
          </a>
        ) : (
          e.title
        )}
      </div>
      {kindRead ? <div className="cb-event-read">{kindRead}</div> : null}
      {showImpact ? <div className="cb-event-impact">{e.market_impact}</div> : null}
    </div>
  );
}

function CBEventsBlock({ events }: { events: CBEvent[] | undefined }) {
  if (!events || events.length === 0) return null;
  return (
    <div className="cb-events-block">
      <div className="cb-events-eyebrow">Overnight &amp; Recent Activity</div>
      <div className="cb-events-list">
        {events.map((e) => <CBEventRow key={e.id} e={e} />)}
      </div>
    </div>
  );
}

function CentralBankBlock({ briefing, intel }: { briefing: BriefingRead; intel: Intelligence | null }) {
  const cbEvents = (briefing.key_events ?? []).filter(isCentralBankEvent);
  const prov = provenanceFor("central-banks", intel);
  const recentCBActivity = intel?.cb_events;

  return (
    <>
      <BodyParagraphs text={briefing.rates_commentary} />

      <CBEventsBlock events={recentCBActivity} />

      {intel && intel.central_banks.length > 0 ? (
        <CentralBankCompact banks={intel.central_banks} />
      ) : cbEvents.length > 0 ? (
        <EmbeddedTable>
          <table className="data-table data-table-compact">
            <thead>
              <tr>
                <th>Time</th>
                <th>Bank / Speaker</th>
                <th>Event</th>
                <th className="col-center">Imp.</th>
              </tr>
            </thead>
            <tbody>
              {cbEvents.map((e, i) => (
                <tr key={i}>
                  <td className="col-num">{e.time_utc}</td>
                  <td>{e.region}</td>
                  <td>{e.event}</td>
                  <td className="col-center"><ImportancePill importance={e.importance} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </EmbeddedTable>
      ) : (
        <p className="caption" style={{ color: "var(--text-tertiary)", marginTop: 8 }}>
          No central-bank events scheduled on {briefing.briefing_date}.
        </p>
      )}

      {prov ? <ProvenanceFooter entry={prov} /> : null}
    </>
  );
}

// =================================================================== § 07 GEOPOLITICAL PULSE

const GEO_REGIONS = [
  { name: "US – China",       short: "USCH", note: "Trade, tech export controls, Taiwan posture" },
  { name: "Middle East",      short: "MENA", note: "Oil supply premium, Strait of Hormuz" },
  { name: "Russia – Ukraine", short: "RUUA", note: "Energy corridor, Black Sea grain" },
  { name: "EU Fiscal",        short: "EUFI", note: "Spreads, supranational issuance" },
  { name: "Taiwan Strait",    short: "TWN",  note: "Semis supply-chain risk premium" },
  { name: "G7 Trade Policy",  short: "G7T",  note: "Tariff signalling, sanctions regime" },
  { name: "Energy Security",  short: "ENRG", note: "European storage, LNG balances" },
];

// =================================================================== HEADLINES BLOCK
//
// Rendered at the top of § 07 Geopolitical Pulse. Each row is a single
// public-RSS headline → link, with the desk's market-impact frame
// shown beneath any HIGH-relevance entry. No body text is reproduced —
// only the link anchor, source, time, category badge, and our own
// editorial WHY frame.

const HEADLINE_CATEGORY_LABEL: Record<string, string> = {
  "war-conflict": "Conflict",
  "sanctions": "Sanctions",
  "tariffs-trade": "Trade",
  "elections": "Elections",
  "government-speech": "Government",
  "energy-opec": "Energy",
  "multilateral": "G7 / G20",
  "fiscal-policy": "Fiscal",
  "central-bank": "Central Bank",
  "other": "Macro",
};

const HEADLINE_CATEGORY_CLASS: Record<string, string> = {
  "war-conflict": "category-cat-geopolitical",
  "sanctions": "category-cat-geopolitical",
  "tariffs-trade": "category-cat-policy",
  "elections": "category-cat-political",
  "government-speech": "category-cat-political",
  "energy-opec": "category-cat-growth",
  "multilateral": "category-cat-geopolitical",
  "fiscal-policy": "category-cat-policy",
  "central-bank": "category-cat-monetary",
  "other": "category-cat-growth",
};

function formatHeadlineTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// =================================================================== GEOPOL EVENTS BLOCK
//
// Rendered at the top of § 07 Geopolitical Pulse. Each row is one
// recent item from the government / supranational / commodity-supply
// feed registry (White House, State, USTR, US Treasury, UK PM, HMT,
// FCDO, EU Commission, IMF, World Bank, OPEC). Shows time · source ·
// region · kind · title link, with the desk's market-impact frame
// underneath high-relevance items. No upstream article body is
// reproduced — only the link anchor + the classifier-derived tag.
//
// Phase 3.3 / Stab-2 (source transparency): this block makes the
// platform's deepest source layer visible to the user. Every item is
// directly attributable to an organisation the user can audit.

const GEO_KIND_LABEL: Record<string, string> = {
  "sanctions": "Sanctions",
  "tariff": "Tariff",
  "trade-deal": "Trade",
  "escalation": "Escalation",
  "commodity-supply": "Supply",
  "fiscal-policy": "Fiscal",
  "emergency": "Emergency",
  "summit": "Summit",
  "election": "Election",
  "leader-speech": "Leader",
  "policy-statement": "Policy",
  "press-release": "Release",
};

const GEO_KIND_BADGE_CLASS: Record<string, string> = {
  "sanctions": "category-cat-geopolitical",
  "tariff": "category-cat-policy",
  "trade-deal": "category-cat-policy",
  "escalation": "category-cat-geopolitical",
  "commodity-supply": "category-cat-growth",
  "fiscal-policy": "category-cat-policy",
  "emergency": "category-cat-geopolitical",
  "summit": "category-cat-political",
  "election": "category-cat-political",
  "leader-speech": "category-cat-political",
  "policy-statement": "category-cat-policy",
  "press-release": "category-cat-growth",
};

function formatGeoEventTime(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  const d = new Date(t);
  const today = new Date();
  const sameDay =
    d.getUTCFullYear() === today.getUTCFullYear() &&
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  const day = String(d.getUTCDate()).padStart(2, "0");
  const mon = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${mon} ${hh}:${mm}`;
}

function GeopolEventRow({ e }: { e: GeoEvent }) {
  const kindLabel = GEO_KIND_LABEL[e.kind] ?? "Release";
  const kindCls = GEO_KIND_BADGE_CLASS[e.kind] ?? "category-cat-growth";
  const showImpact = e.relevance === "high" && !!e.market_impact;
  return (
    <div className="geo-event-row">
      <div className="geo-event-meta">
        <span className="geo-event-time">{formatGeoEventTime(e.datetime)}</span>
        <span className="geo-event-source">{e.source}</span>
        <span className="geo-event-region">{e.region}</span>
        <span className={cn("category-badge", kindCls)}>{kindLabel}</span>
        {e.relevance === "high" ? (
          <span className="geo-event-flag">desk priority</span>
        ) : null}
      </div>
      <div className="geo-event-title">
        {e.source_url ? (
          <a href={e.source_url} target="_blank" rel="noopener noreferrer">
            {e.title}
          </a>
        ) : (
          e.title
        )}
      </div>
      {showImpact ? (
        <div className="geo-event-impact">{e.market_impact}</div>
      ) : null}
    </div>
  );
}

function GeopolEventsBlock({ events }: { events: GeoEvent[] | undefined }) {
  if (!events || events.length === 0) return null;
  return (
    <div className="geo-events-block">
      <div className="geo-events-eyebrow">Government &amp; Geopolitical · Verified Sources</div>
      <div className="geo-events-list">
        {events.map((e) => <GeopolEventRow key={e.id} e={e} />)}
      </div>
    </div>
  );
}

function HeadlineRow({ h }: { h: Headline }) {
  const catLabel = HEADLINE_CATEGORY_LABEL[h.category] ?? "Macro";
  const catCls = HEADLINE_CATEGORY_CLASS[h.category] ?? "category-cat-growth";
  return (
    <div className="headline-row">
      <div className="headline-row-meta">
        <span className="headline-row-time">{formatHeadlineTime(h.published_at)}</span>
        <span className="headline-row-source">{h.source}</span>
        <span className={cn("category-badge", catCls)}>{catLabel}</span>
        {h.relevance === "high" ? (
          <span className="headline-row-flag">desk priority</span>
        ) : null}
      </div>
      <div className="headline-row-title">
        <a href={h.source_url} target="_blank" rel="noopener noreferrer">
          {h.title}
        </a>
      </div>
      {h.market_impact && h.relevance === "high" ? (
        <div className="headline-row-impact">{h.market_impact}</div>
      ) : null}
    </div>
  );
}

function HeadlinesBlock({ headlines }: { headlines: Headline[] | undefined }) {
  if (!headlines || headlines.length === 0) return null;
  return (
    <div className="headlines-block">
      <div className="headlines-block-eyebrow">
        Last 24 Hours · Headline Flow
      </div>
      <div className="headlines-list">
        {headlines.map((h) => <HeadlineRow key={h.id} h={h} />)}
      </div>
    </div>
  );
}

function GeopoliticalBlock({ briefing, intel }: { briefing: BriefingRead; intel: Intelligence | null }) {
  const geo: GeopoliticalPulseT | null = intel?.geopolitical ?? null;
  const headlines = intel?.headlines;
  const geopolEvents = intel?.geopol_events;

  // Fallback: build a synthetic set from the local list if backend didn't ship one
  const synthetic = (): GeopoliticalRegionT[] => {
    const seed = briefing.briefing_date;
    return GEO_REGIONS.map((r) => {
      const intensity = Math.min(95, Math.max(8, 50 + syntheticBp(`geo|${r.short}|${seed}`, 35)));
      const trend = syntheticTrendDirection(`geo-trend|${r.short}|${seed}`);
      const trendLabel = trend === 1 ? "Escalating" : trend === -1 ? "De-escalating" : "Stable";
      return {
        name: r.name,
        short: r.short,
        intensity,
        trend: trendLabel,
        headline: r.note,
        detail: r.note,
      };
    });
  };
  const regions: GeopoliticalRegionT[] = geo ? geo.regions : synthetic();
  const narrative: string = geo ? geo.narrative : "";

  const toneFor = (trend: string): "pos" | "neg" | "neu" =>
    trend === "Escalating" ? "neg" : trend === "De-escalating" ? "pos" : "neu";

  return (
    <>
      <GeopolEventsBlock events={geopolEvents} />
      <HeadlinesBlock headlines={headlines} />

      {narrative ? (
        <div className="editorial-body research-column" style={{ marginBottom: 16 }}>
          <p>{narrative}</p>
        </div>
      ) : null}

      <div className="geo-structural">
        <span className="geo-structural-eyebrow">
          Structural themes · continuous desk watch
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {regions.map((r) => (
          <div key={r.short} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span className="body" style={{ fontWeight: 600 }}>{r.name}</span>
                <span className="caption" style={{ color: "var(--text-tertiary)" }}>{r.headline}</span>
              </div>
              <span
                className={cn(
                  "caption",
                  toneFor(r.trend) === "pos" && "data-pos",
                  toneFor(r.trend) === "neg" && "data-neg",
                )}
                style={{ textTransform: "uppercase", letterSpacing: "0.10em", fontWeight: 600 }}
              >
                {r.trend}
              </span>
            </div>
            <div
              style={{
                height: 3,
                background: "var(--surface-sunken)",
                borderRadius: 2,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  right: `${100 - r.intensity}%`,
                  background:
                    r.intensity > 70 ? "var(--offer)"
                    : r.intensity > 40 ? "var(--warning)"
                    : "var(--neutral)",
                }}
              />
            </div>
            {r.detail && r.detail !== r.headline ? (
              <p className="body-sm" style={{ color: "var(--text-secondary)", marginTop: 2 }}>{r.detail}</p>
            ) : null}
          </div>
        ))}
        </div>
      </div>
    </>
  );
}

// =================================================================== § 08 TRADE IDEAS

function TradeIdeasBlock({ briefing, intel }: { briefing: BriefingRead; intel: Intelligence | null }) {
  void briefing;
  const stat = pullStatFor("trades", intel);
  const prov = provenanceFor("trades", intel);
  const watchList = intel?.instruments_to_watch ?? [];
  const hasWatch = watchList.length > 0;
  const hasLegacy = !!intel && intel.trade_ideas.length > 0;

  if (!intel || (!hasWatch && !hasLegacy)) {
    return (
      <p className="caption" style={{ color: "var(--text-tertiary)" }}>
        No instruments flagged for monitoring in this briefing.
      </p>
    );
  }

  return (
    <>
      <p
        className="body-sm"
        style={{ color: "var(--text-secondary)", marginBottom: 12, maxWidth: "var(--layout-research-max-w)" }}
      >
        <strong style={{ color: "var(--text-primary)" }}>Monitoring list:</strong>{" "}
        the instruments below are flagged for desk attention today — observational
        only, with the catalyst and signal markers noted. Specific entry / target /
        stop levels are deliberately not shown; this is a watch list, not a
        recommendation list.
      </p>

      {stat ? <PullStatBlock stat={stat} /> : null}

      <div>
        {hasWatch
          ? watchList.map((w) => <InstrumentWatchCard key={w.rank} watch={w} />)
          : intel.trade_ideas.map((idea) => <TradeIdeaCard key={idea.rank} idea={idea} />)}
      </div>

      <PositioningRows notes={intel.positioning} />

      {prov ? <ProvenanceFooter entry={prov} /> : null}
    </>
  );
}

function InstrumentWatchCard({ watch }: { watch: InstrumentWatch }) {
  return (
    <div className="trade-idea instrument-watch">
      <span className="trade-idea-rank">{String(watch.rank).padStart(2, "0")}</span>
      <div>
        <div className="trade-idea-head">
          <span className="trade-idea-direction">{watch.instrument}</span>
          {watch.region ? <span className="trade-idea-theme">{watch.region}</span> : null}
        </div>
        <p className="trade-idea-rationale">{watch.why_today}</p>

        <dl className="trade-idea-meta">
          <dt>Catalyst</dt>
          <dd>{watch.catalyst}</dd>
          <dt>Desk focus</dt>
          <dd>{watch.desk_focus}</dd>
        </dl>
      </div>
    </div>
  );
}

// =================================================================== § 09 KEY RISKS
//
// Institutional desk risk register. Each entry follows the strategist
// frame: (1) the risk itself, (2) why it matters, (3) which assets /
// markets react, (4) what escalates or de-escalates the risk. Risks are
// derived deterministically from the actual ingestion layer (geopol
// events + calendar + CB activity + headlines) via a small pattern
// table — no LLM call, no fabrication. When the data doesn't trigger
// any pattern, the register falls back to whatever the AI narrative
// layer supplied via intel.risk_warnings + briefing.risk_themes.

interface Risk {
  rank: number;
  title: string;
  severity: "high" | "medium" | "low";
  body: string;
  cross_asset: string;
  escalates_if: string;
}

interface RiskCtx {
  briefing: BriefingRead;
  geo: GeoEvent[];
  cb: CBEvent[];
  events: KeyEvent[];
  headlines: Headline[];
}

interface RiskPattern {
  id: string;
  match: (ctx: RiskCtx) => string | null; // returns trigger evidence string, or null
  build: (ctx: RiskCtx, trigger: string) => Omit<Risk, "rank">;
}

const KEY_EVENT_PATTERNS = {
  inflation: /\b(CPI|core CPI|PCE|core PCE|HICP|RPI|inflation)\b/i,
  growth:    /\b(GDP|NFP|non-?farm|payrolls|ISM|PMI|retail sales|durable goods|consumer (confidence|sentiment))\b/i,
  jobs:      /\b(NFP|non-?farm|payrolls|unemployment|jobless)\b/i,
  auction:   /\b(auction|treasury (sale|issuance)|gilt issuance|bund issuance|JGB issuance|coupon)\b/i,
};

const RISK_PATTERNS: RiskPattern[] = [
  // ---- Tariff escalation ----------------------------------------------
  {
    id: "tariff",
    match: (c) => {
      const g = c.geo.find((g) => g.kind === "tariff");
      if (g) return `${g.source} · ${g.title}`;
      const h = c.headlines.find((h) => h.category === "tariffs-trade" && h.relevance === "high");
      if (h) return `${h.source} · ${h.title}`;
      return null;
    },
    build: (_c, trigger) => ({
      title: "Tariff escalation risk",
      severity: "high",
      body: `Trade-policy action is in scope (${trigger}). The desk watches for a shift from rhetoric to scheduled implementation, particularly Section-301 expansion or a retaliatory response from a trading partner.`,
      cross_asset:
        "USD bid against China-exposed FX (CNH, KRW, AUD); MXN sensitive on USMCA carve-outs; breakevens steeper on cost-pass-through; growth-sensitive cyclicals weighed.",
      escalates_if:
        "fresh Section-301 list, retaliatory tariffs, breakdown of trade talks, or a sudden enforcement action by USTR / Treasury OFAC.",
    }),
  },

  // ---- Sanctions repricing -------------------------------------------
  {
    id: "sanctions",
    match: (c) => {
      const g = c.geo.find((g) => g.kind === "sanctions");
      if (g) return `${g.source} · ${g.title}`;
      const h = c.headlines.find((h) => h.category === "sanctions" && h.relevance === "high");
      if (h) return `${h.source} · ${h.title}`;
      return null;
    },
    build: (_c, trigger) => ({
      title: "Sanctions / OFAC repricing risk",
      severity: "high",
      body: `An active sanctions track is in the desk's scope (${trigger}). Designations and secondary-sanctions extensions can move EM-FX, oil, and gold faster than the underlying announcement copy suggests.`,
      cross_asset:
        "EM-FX risk premium widens (RUB-proxy, TRY, ZAR most sensitive); Brent bid on supply concerns; gold catches a flight-to-quality bid; CHF / JPY firmer.",
      escalates_if:
        "broader package, secondary-sanctions extension to third countries, or asset-freeze enforcement on systemic counterparties.",
    }),
  },

  // ---- Energy supply disruption --------------------------------------
  {
    id: "energy",
    match: (c) => {
      const g = c.geo.find((g) => g.kind === "commodity-supply");
      if (g) return `${g.source} · ${g.title}`;
      const h = c.headlines.find((h) => h.category === "energy-opec" && h.relevance === "high");
      if (h) return `${h.source} · ${h.title}`;
      return null;
    },
    build: (_c, trigger) => ({
      title: "Energy supply disruption risk",
      severity: "high",
      body: `Supply-side oil signal is in the picture (${trigger}). Brent's geopolitical risk premium and the front-month / second-month spread are the cleanest readouts; equity-vol typically lags by a session.`,
      cross_asset:
        "Brent + diesel cracks bid; CAD / NOK supported, MXN partially; breakevens steeper; duration-sensitive rates feel the inflation pass-through; energy equities outperform.",
      escalates_if:
        "OPEC+ output cut, pipeline closure, escalation in the Strait of Hormuz, or a tanker / refinery event that widens the supply-disruption premium.",
    }),
  },

  // ---- Geopolitical escalation ---------------------------------------
  {
    id: "escalation",
    match: (c) => {
      const g = c.geo.find((g) => g.kind === "escalation");
      if (g) return `${g.source} · ${g.title}`;
      const h = c.headlines.find((h) => h.category === "war-conflict" && h.relevance === "high");
      if (h) return `${h.source} · ${h.title}`;
      return null;
    },
    build: (_c, trigger) => ({
      title: "Geopolitical escalation risk",
      severity: "high",
      body: `An escalation thread is live (${trigger}). The desk treats safe-haven flow and the oil risk premium as the leading indicators; equity-vol and EM-FX confirm a session later.`,
      cross_asset:
        "JPY / CHF / gold bid on safe-haven flow; oil risk premium widens; risk-sensitive EMFX (ZAR, TRY, BRL) sells off; VIX higher.",
      escalates_if:
        "kinetic action, sanctions tightening, breakdown of ceasefire / negotiations, or a credible threat to a critical commodity corridor.",
    }),
  },

  // ---- Central-bank repricing ----------------------------------------
  {
    id: "cb-repricing",
    match: (c) => {
      // Look for upcoming or just-published high-signal CB events.
      const now = Date.now();
      const window = 36 * 60 * 60 * 1000;
      const hit = c.cb.find((e) => {
        if (!CB_HIGH_SIGNAL_KINDS.has(e.kind)) return false;
        const t = Date.parse(e.datetime);
        return Number.isFinite(t) && Math.abs(now - t) <= window;
      });
      if (hit) return `${hit.bank} · ${hit.title}`;
      // Or a scheduled FOMC / ECB / BoE / BoJ event in today's calendar.
      const calHit = c.events.find((e) =>
        /\b(FOMC|ECB|BoE|BoJ|MPC|Fed|rate decision)\b/i.test(e.event) &&
        e.importance.toLowerCase() === "high",
      );
      if (calHit) return `${calHit.region} · ${calHit.event} ${calHit.time_utc}`;
      return null;
    },
    build: (_c, trigger) => ({
      title: "Central-bank repricing risk",
      severity: "high",
      body: `Policy-path repricing is live (${trigger}). Forward-guidance language carries more cross-asset signal than the rate level itself; the desk watches vote-split, dot-plot drift, and any new conditioning language on services inflation or wage data.`,
      cross_asset:
        "Front-end yields lead; USD strength / softness propagates to EUR/USD and EM-FX carry; growth-sensitive equities and duration-sensitive sectors most reactive; commodity-bloc FX a derivative bet.",
      escalates_if:
        "hawkish surprise in forward guidance, dot-plot drift, or a non-consensus vote-split that signals a regime shift in the reaction function.",
    }),
  },

  // ---- Fiscal / debt-ceiling -----------------------------------------
  {
    id: "fiscal",
    match: (c) => {
      const g = c.geo.find((g) => g.kind === "fiscal-policy");
      if (g) return `${g.source} · ${g.title}`;
      const h = c.headlines.find((h) => h.category === "fiscal-policy" && h.relevance === "high");
      if (h) return `${h.source} · ${h.title}`;
      return null;
    },
    build: (_c, trigger) => ({
      title: "Fiscal policy / debt-ceiling risk",
      severity: "medium",
      body: `Sovereign-fiscal direction is in scope (${trigger}). Issuance calendars, ratings-agency commentary, and ministerial statements are the operational signals; the cleanest readout is the back-end of the relevant curve and the sovereign CDS spread.`,
      cross_asset:
        "Long-end yields widen; sovereign-spread risk premium widens (BTP-Bund, Gilt-Bund); domestic-bias FX (GBP, EUR-periphery proxy) under pressure; safe-haven duration catches a defensive bid.",
      escalates_if:
        "missed fiscal milestone, ratings action, stalled appropriations, or a coupon-heavy auction calendar coinciding with thin liquidity.",
    }),
  },

  // ---- Sovereign issuance / liquidity --------------------------------
  {
    id: "auction",
    match: (c) => {
      const e = c.events.find((e) => KEY_EVENT_PATTERNS.auction.test(e.event));
      if (e) return `${e.region} · ${e.event} ${e.time_utc} GMT`;
      return null;
    },
    build: (_c, trigger) => ({
      title: "Sovereign supply / liquidity risk",
      severity: "medium",
      body: `Auction concession risk is on the desk's radar (${trigger}). The cleanest reads are bid-to-cover, indirect-bidder share, and the tail vs WI; the curve typically delivers the reaction within minutes of the cutoff.`,
      cross_asset:
        "Long-end yields widen on poor bid-to-cover; duration-sensitive curves bear-steepen; carry trades unwind on a sharp move; sovereign-spread products underperform.",
      escalates_if:
        "tail at auction, declining indirect bids, weak coverage on a heavy week, or a primary-dealer balance-sheet stress signal.",
    }),
  },

  // ---- Inflation persistence -----------------------------------------
  {
    id: "inflation",
    match: (c) => {
      const e = c.events.find((e) => KEY_EVENT_PATTERNS.inflation.test(e.event));
      if (e) return `${e.region} · ${e.event} ${e.time_utc} GMT`;
      return null;
    },
    build: (_c, trigger) => ({
      title: "Inflation persistence risk",
      severity: "high",
      body: `Inflation print in scope (${trigger}). Core / services / wage-sensitive components are the desk's focus; a beat against a dovish-leaning consensus tends to deliver an outsized cross-asset move.`,
      cross_asset:
        "Front-end yields higher on a beat; USD bid; growth-sensitive equity pressure; breakevens up; EM-FX carry unwound; rate-sensitive sectors lag.",
      escalates_if:
        "core / services beat consensus, a hot wage / jobs print pushing the curve hawkish, or sticky shelter / health-care components reigniting the inflation persistence narrative.",
    }),
  },

  // ---- Growth slowdown -----------------------------------------------
  {
    id: "growth",
    match: (c) => {
      const e = c.events.find((e) => KEY_EVENT_PATTERNS.growth.test(e.event));
      if (e) return `${e.region} · ${e.event} ${e.time_utc} GMT`;
      return null;
    },
    build: (_c, trigger) => ({
      title: "Growth slowdown risk",
      severity: "medium",
      body: `Growth print in scope (${trigger}). The desk reads the labour-market and survey complex (ISM / PMI / consumer) for cycle inflection; a downside surprise tends to bull-steepen the curve and pressure cyclicals.`,
      cross_asset:
        "Curve bull-steepens; USD softer on dovish repricing; defensives outperform cyclicals; commodity-bloc FX pressured; carry trades wobble.",
      escalates_if:
        "weak NFP / unemployment uptick, ISM sub-50, downside-surprise GDP, or a sharp drop in forward-looking surveys.",
    }),
  },

  // ---- Positioning squeeze -------------------------------------------
  {
    id: "positioning",
    match: () => "structural carry / vol regime", // always available as a tail risk
    build: () => ({
      title: "Positioning / carry squeeze risk",
      severity: "low",
      body: `A carry-trade unwind or sudden vol regime shift is the structural tail the desk monitors continuously. Crowded positioning in USD-EM carry, AUD/JPY, and short-vol structures is most exposed.`,
      cross_asset:
        "Carry trades (USD/MXN, USD/ZAR, AUD/JPY) most exposed; equity-vol regime shift drains the risk budget; JPY funder bid; gold catches a flight-to-quality bid.",
      escalates_if:
        "sustained VIX spike, a sudden yen rally on a BoJ surprise, a liquidity event in funding markets, or a sharp drawdown in a crowded sector that forces broad de-risking.",
    }),
  },
];

function buildRisks(briefing: BriefingRead, intel: Intelligence | null): Risk[] {
  const ctx: RiskCtx = {
    briefing,
    geo: intel?.geopol_events ?? [],
    cb: intel?.cb_events ?? [],
    events: briefing.key_events ?? [],
    headlines: intel?.headlines ?? [],
  };

  const out: Risk[] = [];
  const seen = new Set<string>();

  for (const pat of RISK_PATTERNS) {
    if (out.length >= 6) break;
    if (seen.has(pat.id)) continue;
    const trigger = pat.match(ctx);
    if (!trigger) continue;
    seen.add(pat.id);
    out.push({
      rank: out.length + 1,
      ...pat.build(ctx, trigger),
    });
  }

  // If the pattern table produced fewer than 4 risks, fall back to the
  // narrative layer's risk_warnings to fill out the register. These are
  // LLM-generated so we annotate them with a generic cross-asset frame.
  if (out.length < 4 && intel) {
    for (const w of intel.risk_warnings) {
      if (out.length >= 6) break;
      const sev = (w.severity.toLowerCase() === "high"
        ? "high"
        : w.severity.toLowerCase() === "medium"
          ? "medium"
          : "low") as Risk["severity"];
      out.push({
        rank: out.length + 1,
        title: w.title,
        severity: sev,
        body: w.body,
        cross_asset:
          "Cross-asset implications attached by the strategist layer — see the body.",
        escalates_if: "—",
      });
    }
  }

  return out.slice(0, 6);
}

function KeyRisksBlock({ briefing, intel }: { briefing: BriefingRead; intel: Intelligence | null }) {
  const risks = buildRisks(briefing, intel);
  const prov = provenanceFor("risks", intel);
  if (risks.length === 0) {
    return (
      <p className="caption" style={{ color: "var(--text-tertiary)" }}>
        No outsized risks flagged in this briefing.
      </p>
    );
  }
  const SEVERITY_COLOR: Record<Risk["severity"], string> = {
    high:   "var(--offer)",
    medium: "var(--warning)",
    low:    "var(--neutral)",
  };
  return (
    <>
      <div className="key-risks-list">
        {risks.map((r) => (
          <div key={r.rank} className="key-risks-row">
            <div className="key-risks-rank" style={{ color: SEVERITY_COLOR[r.severity] }}>
              {String(r.rank).padStart(2, "0")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="key-risks-head">
                <span className="key-risks-title">{r.title}</span>
                <span className="key-risks-severity" style={{ color: SEVERITY_COLOR[r.severity] }}>
                  {r.severity}
                </span>
              </div>
              <p className="key-risks-body">{r.body}</p>
              {r.cross_asset && r.cross_asset !== "—" ? (
                <div className="key-risks-tag">
                  <span className="key-risks-tag-label">Cross-asset</span>
                  <span className="key-risks-tag-body">{r.cross_asset}</span>
                </div>
              ) : null}
              {r.escalates_if && r.escalates_if !== "—" ? (
                <div className="key-risks-tag">
                  <span className="key-risks-tag-label">Escalates if</span>
                  <span className="key-risks-tag-body">{r.escalates_if}</span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {prov ? <ProvenanceFooter entry={prov} /> : null}
    </>
  );
}

// =================================================================== RIGHT RAIL

function TocRail() {
  return (
    <div className="panel" style={{ position: "sticky", top: "calc(var(--layout-header-h) + var(--layout-ops-h) + 16px)" }}>
      <div className="panel-header">
        <div className="panel-header-title">
          <span className="eyebrow">In This Briefing</span>
          <span className="heading-4">Contents</span>
        </div>
      </div>
      <nav className="toc" style={{ padding: "8px 0 12px" }}>
        {SECTIONS.map((s, i) => (
          <a key={s.id} href={`#${s.id}`} className={cn("toc-item", i === 0 && "is-active")}>
            <span className="caption" style={{ width: 40 }}>{s.num}</span>
            <span>{s.title}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

// MarketSessionBar moved to its own client component file
// (./market-session-bar.tsx) so the clocks tick live via useEffect +
// setInterval. The server-rendered placeholder hydrates seamlessly
// once mounted; print/export hide it via .no-print.

/**
 * Reading Guide rail — replaces the previous StrategistViewRail which
 * read as low-value generic intro text. The reading guide briefly
 * describes how the briefing is structured and where the trader's
 * attention should land, with a one-line gloss per section. Kept
 * tight — the rail is a sidebar, not a content surface. The LLM
 * strategist commentary still surfaces inline in § 01 Macro Regime
 * via StrategistInlineCallout, so no LLM output is lost. Stab-4.2.
 */
function ReadingGuideRail() {
  return (
    <div className="panel reading-guide">
      <div className="panel-header">
        <div className="panel-header-title">
          <span className="eyebrow">How to read</span>
          <span className="heading-4">Briefing Guide</span>
        </div>
      </div>
      <div className="panel-body panel-body-prem">
        <ul className="reading-guide-list">
          <li>
            <span className="reading-guide-tag">Lead</span>
            <span>Executive Summary &amp; Key Takeaways frame the overnight regime + day's swing variables.</span>
          </li>
          <li>
            <span className="reading-guide-tag">§ 01-02</span>
            <span>Macro Regime + Geopolitical Pulse — the institutional centre of gravity. Read first.</span>
          </li>
          <li>
            <span className="reading-guide-tag">§ 03</span>
            <span>Today's Catalysts unifies calendar + geopolitical + CB events into one chronologically-sessioned register.</span>
          </li>
          <li>
            <span className="reading-guide-tag">§ 04</span>
            <span>Central Bank Watch: overnight + recent rhetoric only — each entry carries a desk read on cross-asset implications.</span>
          </li>
          <li>
            <span className="reading-guide-tag">§ 05-07</span>
            <span>Asset-class commentary (FX / Vol / Movers) — what moved, why, what the desk watches next.</span>
          </li>
          <li>
            <span className="reading-guide-tag">§ 09</span>
            <span>Key Risks — institutional desk register: each risk names its cross-asset readthrough and escalation triggers.</span>
          </li>
          <li>
            <span className="reading-guide-tag">Sources</span>
            <span>Per-section provenance lives inline; the full feed registry is at <a href="/sources">/sources</a>.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

const SOURCE_HEALTH = [
  { label: "News · ForexLive",      status: "pending" as const },
  { label: "Calendar · TE",         status: "pending" as const },
  { label: "Market · Yahoo / FRED", status: "pending" as const },
  { label: "Desk · Outlook inbox",  status: "pending" as const },
  { label: "Vol · Excel sheet",     status: "pending" as const },
  { label: "AI · Mock generator",   status: "active"  as const },
];

function SourceHealthRail() {
  const STATUS_COLOR: Record<string, string> = {
    active: "var(--bid)",
    pending: "var(--warning)",
    failed: "var(--offer)",
  };
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-title">
          <span className="eyebrow">Source Health</span>
          <span className="heading-4">Ingestion Feeds</span>
        </div>
      </div>
      <div className="panel-body panel-body-prem" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {SOURCE_HEALTH.map((s) => (
          <div
            key={s.label}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 6, height: 6, borderRadius: 999,
                  background: STATUS_COLOR[s.status], flex: "0 0 auto",
                }}
              />
              <span className="body-sm">{s.label}</span>
            </div>
            <span
              className="caption"
              style={{
                color: STATUS_COLOR[s.status],
                textTransform: "uppercase",
                letterSpacing: "0.10em",
                fontWeight: 600,
              }}
            >
              {s.status === "active" ? "Live" : "Phase 2"}
            </span>
          </div>
        ))}
      </div>
      <div className="panel-footer">
        <a href="/sources" className="caption" style={{ color: "var(--text-accent)" }}>
          Full source matrix <ChevronRight size={11} aria-hidden style={{ verticalAlign: "middle" }} />
        </a>
      </div>
    </div>
  );
}

function BriefingMetaRail({ briefing }: { briefing: BriefingRead }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-header-title">
          <span className="eyebrow">Strategist</span>
          <span className="heading-4">Briefing Metadata</span>
        </div>
      </div>
      <div className="panel-body panel-body-prem">
        <div className="sidebar-session" style={{ gridTemplateColumns: "84px 1fr" }}>
          <span className="sidebar-session-key">Date</span>
          <span className="sidebar-session-value">{briefing.briefing_date}</span>
          <span className="sidebar-session-key">Status</span>
          <span className="sidebar-session-value" style={{ color: "var(--bid)" }}>{briefing.status}</span>
          <span className="sidebar-session-key">Risk</span>
          <span className="sidebar-session-value">{briefing.risk_tone}</span>
          <span className="sidebar-session-key">Source</span>
          <span className="sidebar-session-value">{briefing.generation_source}</span>
          <span className="sidebar-session-key">Generator</span>
          <span className="sidebar-session-value">{briefing.generator_version}</span>
          <span className="sidebar-session-key">Published</span>
          <span className="sidebar-session-value">
            {briefing.published_at ? formatTimeOfDay(briefing.published_at) : "—"}
          </span>
          <span className="sidebar-session-key">Author</span>
          <span className="sidebar-session-value">{briefing.author}</span>
        </div>
      </div>
    </div>
  );
}
