import type { ReactNode } from "react";
import { Panel, PanelBody, PanelHeader } from "../ui/Panel";
import { RiskPill, StatusPill, ImportancePill } from "../ui/StatusPill";
import { LiveDot } from "../ui/LiveDot";
import { formatLongDate, formatTimeOfDay } from "../../lib/utils/date";
import { formatPrice, formatSymbol } from "../../lib/utils/format";
import type { BriefingRead, BriefingSummary } from "../../lib/types/briefing";
import { Link } from "react-router-dom";

interface BriefingReaderProps {
  briefing: BriefingRead;
  related: BriefingSummary[];
}

const SECTIONS: { id: string; num: string; eyebrow: string; title: string }[] = [
  { id: "summary",     num: "§ 01", eyebrow: "Summary",     title: "Executive Summary" },
  { id: "fx",          num: "§ 02", eyebrow: "FX",          title: "G10 & Crosses" },
  { id: "rates",       num: "§ 03", eyebrow: "Rates",       title: "USTs & G7 Curves" },
  { id: "equities",    num: "§ 04", eyebrow: "Equities",    title: "Index & Single-Stock Dynamics" },
  { id: "commodities", num: "§ 05", eyebrow: "Commodities", title: "Energy, Metals, Bulks" },
  { id: "events",      num: "§ 06", eyebrow: "Calendar",    title: "Key Events Today" },
  { id: "themes",      num: "§ 07", eyebrow: "Themes",      title: "Watchlist" },
];

export function BriefingReader({ briefing, related }: BriefingReaderProps) {
  return (
    <div className="workspace">
      {/* Reading column */}
      <article className="col-span-8 panel panel-research panel-highlight">
        <div className="panel-body panel-body-edit">
          <div className="masthead-rule" style={{ marginBottom: 20 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
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
            <span>{formatLongDate(briefing.briefing_date)} · {formatTimeOfDay(briefing.published_at ?? briefing.created_at)}</span>
            <span>{Math.max(2, Math.round(briefing.executive_summary.length / 250))} min read</span>
            <span>
              <LiveDot />
              &nbsp;<span style={{ color: "var(--bid)" }}>Live</span>
            </span>
          </div>

          <div className="divider-h divider-strong" style={{ margin: "24px 0" }} />

          <Section id="summary" num="§ 01" eyebrow="Summary" title="Executive Summary">
            <ExecutiveBody summary={briefing.executive_summary} />
          </Section>

          <Section id="fx" num="§ 02 · FX" eyebrow="FX" title="G10 & Crosses">
            <BodyParagraphs text={briefing.fx_commentary} />
            <FxEmbed briefing={briefing} />
          </Section>

          <Section id="rates" num="§ 03 · Rates" eyebrow="Rates" title="USTs & G7 Curves">
            <BodyParagraphs text={briefing.rates_commentary} />
          </Section>

          <Section id="equities" num="§ 04 · Equities" eyebrow="Equities" title="Index & Single-Stock Dynamics">
            <BodyParagraphs text={briefing.equities_commentary} />
          </Section>

          <Section id="commodities" num="§ 05 · Commodities" eyebrow="Commodities" title="Energy, Metals, Bulks">
            <BodyParagraphs text={briefing.commodities_commentary} />
          </Section>

          <Section id="events" num="§ 06 · Calendar" eyebrow="Calendar" title="Key Events Today">
            <EventsEmbed briefing={briefing} />
          </Section>

          <Section id="themes" num="§ 07 · Themes" eyebrow="Themes" title="Watchlist">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {briefing.risk_themes.map((t, i) => (
                <span key={i} className="ticker-chip ticker-chip-neu">{t}</span>
              ))}
            </div>
          </Section>

          <div className="divider-h divider-strong" style={{ margin: "28px 0 12px" }} />
          <div className="editorial-meta">
            <span>Briefing ID · {briefing.id}</span>
            <span>Generator {briefing.generator_version} · {briefing.generation_source}</span>
            <span>Distribution: {briefing.desk}</span>
          </div>
        </div>
      </article>

      {/* Right rail */}
      <aside className="col-span-4" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Sticky jump-to nav */}
        <div className="panel" style={{ position: "sticky", top: "calc(var(--layout-header-h) + 16px)" }}>
          <PanelHeader eyebrow="In This Briefing" title="Sections" />
          <div className="toc" style={{ padding: "8px 0 12px" }}>
            {SECTIONS.map((s, i) => (
              <a key={s.id} href={`#${s.id}`} className={`toc-item ${i === 0 ? "is-active" : ""}`}>
                <span className="caption" style={{ width: 32 }}>{s.num}</span>
                <span>{s.title}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Market snapshot */}
        <Panel>
          <PanelHeader eyebrow={`As of ${briefing.briefing_date}`} title="Market Snapshot" />
          <PanelBody density="premium">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {snapshotEntries(briefing).map((row, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="body-sm">{row.label}</span>
                  <span className="data">{row.value}</span>
                </div>
              ))}
            </div>
          </PanelBody>
        </Panel>

        {/* Related briefings */}
        <Panel>
          <PanelHeader eyebrow="Archive" title="Previous Briefings" />
          <PanelBody density="premium" style={{ paddingTop: 4, paddingBottom: 4 }}>
            {related.length === 0 ? (
              <span className="caption" style={{ color: "var(--text-tertiary)" }}>
                No earlier briefings yet.
              </span>
            ) : (
              related.map((b) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ minWidth: 0 }}>
                    <Link to={`/briefings/${b.briefing_date}`} className="body-sm" style={{ color: "var(--text-primary)" }}>
                      {b.title}
                    </Link>
                    <div className="caption" style={{ color: "var(--text-tertiary)", marginTop: 2 }}>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{b.briefing_date}</span>
                      {" · "}
                      <span>{b.briefing_type.replace("_", " ")}</span>
                      {" · "}
                      <span style={{ color: riskColor(b.risk_tone) }}>{riskLabel(b.risk_tone)}</span>
                    </div>
                  </div>
                  <Link to={`/briefings/${b.briefing_date}`} className="caption">↗</Link>
                </div>
              ))
            )}
          </PanelBody>
          <div className="panel-footer">
            <Link to="/archive" className="caption" style={{ color: "var(--text-accent)" }}>Open archive →</Link>
          </div>
        </Panel>
      </aside>
    </div>
  );
}

// ----------------------------------------------------------------- helpers

function Section({
  id,
  num,
  eyebrow: _eyebrow,
  title,
  children,
}: {
  id: string;
  num: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border-subtle)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 16 }}>
        <span className="eyebrow" style={{ color: "var(--makor-300)" }}>{num}</span>
        <h2 className="heading-3">{title}</h2>
        <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
      </div>
      {children}
    </section>
  );
}

function ExecutiveBody({ summary }: { summary: string }) {
  const paragraphs = splitParagraphs(summary);
  return (
    <div className="editorial-body research-column">
      {paragraphs.map((p, i) => (
        <p key={i} className={i === 0 ? "first-graf" : undefined} style={i === 0 ? firstGrafStyle : undefined}>
          {p}
        </p>
      ))}
    </div>
  );
}

const firstGrafStyle = undefined; // styling is handled via CSS class .first-graf in components.css; we add the style here for safety.

function BodyParagraphs({ text }: { text: string }) {
  const paragraphs = splitParagraphs(text);
  return (
    <div className="editorial-body research-column">
      {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
    </div>
  );
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}|(?<=\.)\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function FxEmbed({ briefing }: { briefing: BriefingRead }) {
  const fx = briefing.market_snapshot?.fx ?? {};
  const order = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD"];
  const rows = order.filter((s) => typeof fx[s] === "number");
  if (rows.length === 0) return null;
  return (
    <div style={{ margin: "16px 0", border: "1px solid var(--border-subtle)", borderRadius: 3 }}>
      <table className="data-table data-table-compact">
        <thead>
          <tr>
            <th>Pair</th>
            <th className="col-num">Last</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s}>
              <td>{formatSymbol(s)}</td>
              <td className="col-num">{formatPrice(s, fx[s] as number)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventsEmbed({ briefing }: { briefing: BriefingRead }) {
  const events = briefing.key_events ?? [];
  if (events.length === 0) {
    return <p className="caption" style={{ color: "var(--text-tertiary)" }}>No scheduled events.</p>;
  }
  return (
    <div style={{ margin: "8px 0", border: "1px solid var(--border-subtle)", borderRadius: 3 }}>
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
    </div>
  );
}

function snapshotEntries(b: BriefingRead) {
  const out: { label: string; value: string }[] = [];
  const snap = b.market_snapshot;
  if (!snap) return out;
  const fxOrder = ["EURUSD", "GBPUSD", "USDJPY"];
  const eqOrder = ["SPX", "NDX", "SX5E", "NKY"];
  const ctyOrder = ["BRENT", "GOLD"];
  const rtOrder = ["UST_10Y", "BUND_10Y"];
  for (const k of fxOrder) {
    if (typeof snap.fx?.[k] === "number") out.push({ label: formatSymbol(k), value: formatPrice(k, snap.fx[k] as number) });
  }
  for (const k of rtOrder) {
    if (typeof snap.rates?.[k] === "number") out.push({ label: k.replace("_", " "), value: formatPrice(k, snap.rates[k] as number) });
  }
  for (const k of eqOrder) {
    if (typeof snap.equities?.[k] === "number") out.push({ label: k, value: formatPrice(k, snap.equities[k] as number) });
  }
  for (const k of ctyOrder) {
    if (typeof snap.commodities?.[k] === "number") out.push({ label: k, value: formatPrice(k, snap.commodities[k] as number) });
  }
  return out;
}

function riskLabel(t: string): string {
  switch (t) {
    case "risk_on": return "Risk-On";
    case "risk_off": return "Risk-Off";
    case "mixed": return "Mixed";
    default: return "Neutral";
  }
}

function riskColor(t: string): string {
  switch (t) {
    case "risk_on": return "var(--bid)";
    case "risk_off": return "var(--offer)";
    case "mixed": return "var(--warning)";
    default: return "var(--neutral)";
  }
}
