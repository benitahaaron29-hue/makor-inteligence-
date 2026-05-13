import { CommandBar } from "@/components/layout/command-bar";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/states";
import {
  sourcesApi,
  type SourceCategory,
  type SourceStatus,
  type SourceView,
} from "@/lib/api/sources";
import { relativeFromNow } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

const CATEGORY_TITLE: Record<SourceCategory, { eyebrow: string; title: string }> = {
  synthesis:     { eyebrow: "AI Synthesis",                   title: "Briefing Generation" },
  market:        { eyebrow: "Market Data",                    title: "FX · Rates · Commodities · Vol" },
  calendar:      { eyebrow: "Economic Calendar",              title: "Events & Forecasts" },
  central_banks: { eyebrow: "Central Bank Activity",          title: "Fed · ECB · BoE · BoJ · SNB" },
  geopolitical:  { eyebrow: "Government & Geopolitical Feeds", title: "Executive · Treasury · Trade · Supranational · Energy" },
  news:          { eyebrow: "News · Macro Headlines",         title: "Overnight Narrative" },
  desk:          { eyebrow: "Internal Desk Intelligence",     title: "Proprietary Color" },
  volatility:    { eyebrow: "Volatility · Options",           title: "Implied Vol & Regime" },
};

const CATEGORY_ORDER: SourceCategory[] = [
  "synthesis",
  "market",
  "calendar",
  "central_banks",
  "geopolitical",
  "news",
  "desk",
  "volatility",
];

const STATUS_COLOR: Record<SourceStatus, string> = {
  live:     "var(--bid)",
  degraded: "var(--offer)",
  fallback: "var(--info)",
  mock:     "var(--makor-300)",
  phase_2:  "var(--warning)",
};

const STATUS_LABEL: Record<SourceStatus, string> = {
  live:     "LIVE",
  degraded: "DEGRADED",
  fallback: "FALLBACK",
  mock:     "MOCK",
  phase_2:  "PHASE 2",
};

export default async function SourcesPage() {
  let sources: SourceView[] = [];
  let fetchError: string | null = null;
  try {
    sources = await sourcesApi.list();
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Unknown error";
  }

  const summary = summarize(sources);
  const grouped = groupByCategory(sources);

  return (
    <>
      <CommandBar
        crumbs={[{ label: "Sources" }]}
        leftExtras={
          fetchError ? null : (
            <span className="caption" style={{ color: "var(--text-tertiary)" }}>
              {sources.length} adapters · {summary.live} live · {summary.fallback} fallback · {summary.degraded} degraded · {summary.pending} phase&nbsp;2
            </span>
          )
        }
      />

      <div className="workspace">
        {fetchError ? (
          <div className="col-span-12">
            <ErrorState
              title="Could not load source registry"
              message={fetchError}
              detail="The desk data service did not respond. Retry, or refresh the page."
            />
          </div>
        ) : (
          <>
            <div className="col-span-12">
              <Intro />
            </div>

            {CATEGORY_ORDER.map((cat) => {
              const rows = grouped.get(cat) ?? [];
              if (rows.length === 0) return null;
              return (
                <div key={cat} className="col-span-12">
                  <SourceCategoryCard
                    eyebrow={CATEGORY_TITLE[cat].eyebrow}
                    title={CATEGORY_TITLE[cat].title}
                    rows={rows}
                    allRows={sources}
                  />
                </div>
              );
            })}

            <div className="col-span-12">
              <ReliabilityFootnote />
            </div>
          </>
        )}
      </div>
    </>
  );
}

// =================================================================== INTRO

function Intro() {
  return (
    <Card>
      <CardHeader eyebrow="Operations" title="Connected Feeds" />
      <CardBody density="premium">
        <p className="body" style={{ maxWidth: 820 }}>
          Every section of the morning briefing is grounded in a public,
          no-auth source you can audit row by row. The synthesis layer
          composes commentary STRICTLY over the items below — anything
          not in this registry is not in the briefing. A failed feed
          gracefully degrades to "fallback" or "unavailable" status; the
          briefing renders the available sections and flags the gap
          rather than hiding it.
        </p>
        <p className="body" style={{ maxWidth: 820, marginTop: 8 }}>
          Status reflects this serverless instance's most recent probe
          of each feed. Refresh the page to re-poll. Per-feed errors are
          shown verbatim under <code>last_error</code> in the diagnostic
          payload at <code>/api/diag</code>.
        </p>
      </CardBody>
    </Card>
  );
}

// =================================================================== CATEGORY

function SourceCategoryCard({
  eyebrow,
  title,
  rows,
  allRows,
}: {
  eyebrow: string;
  title: string;
  rows: SourceView[];
  allRows: SourceView[];
}) {
  return (
    <Card>
      <CardHeader eyebrow={eyebrow} title={title} />
      <CardBody density="flush">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 180 }}>Source</th>
              <th>Vendor · Region</th>
              <th>Cadence</th>
              <th className="col-num" style={{ width: 70 }}>Latency</th>
              <th style={{ width: 180 }}>Fallback chain</th>
              <th className="col-center" style={{ width: 100 }}>Status</th>
              <th className="col-num" style={{ width: 120 }}>Reliability</th>
              <th style={{ width: 110 }}>Last success</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>{r.name}</span>
                    {r.critical_path ? (
                      <span
                        className="caption"
                        style={{
                          color: "var(--makor-300)",
                          textTransform: "uppercase",
                          letterSpacing: "0.10em",
                          fontWeight: 600,
                          fontSize: 9,
                        }}
                      >
                        Critical path
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="caption" style={{ color: "var(--text-secondary)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <span style={{ color: "var(--text-primary)" }}>{r.vendor ?? "—"}</span>
                    <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: 10 }}>
                      {r.region ?? "—"} · {r.integration}
                    </span>
                  </div>
                </td>
                <td className="caption" style={{ color: "var(--text-secondary)" }}>
                  {r.cadence}
                </td>
                <td className="col-num">
                  <Latency ms={r.latency_ms} />
                </td>
                <td>
                  <FallbackChain row={r} all={allRows} />
                </td>
                <td className="col-center">
                  <StatusBadge status={r.status} />
                </td>
                <td className="col-num">
                  <Reliability score={r.reliability_score} status={r.status} />
                </td>
                <td className="caption" style={{ color: "var(--text-tertiary)" }}>
                  {r.last_success_at ? relativeFromNow(r.last_success_at) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

// =================================================================== STATUS

function StatusBadge({ status }: { status: SourceStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: color,
          flex: "0 0 auto",
        }}
      />
      <span
        className="caption"
        style={{
          color,
          fontWeight: 600,
          letterSpacing: "0.10em",
          fontSize: 10,
        }}
      >
        {STATUS_LABEL[status]}
      </span>
    </span>
  );
}

// =================================================================== RELIABILITY

function Latency({ ms }: { ms: number | null }) {
  if (ms === null || ms === undefined) {
    return <span className="caption" style={{ color: "var(--text-tertiary)" }}>—</span>;
  }
  const color =
    ms < 100 ? "var(--bid)"
    : ms < 500 ? "var(--makor-300)"
    : ms < 1500 ? "var(--warning)"
    : "var(--offer)";
  return (
    <span
      className="data-sm"
      style={{ color, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}
    >
      {ms} ms
    </span>
  );
}

function Reliability({
  score,
  status,
}: {
  score: number | null;
  status: SourceStatus;
}) {
  if (score === null) {
    return (
      <span className="caption" style={{ color: "var(--text-tertiary)" }}>
        —
      </span>
    );
  }
  const pct = Math.round(score * 1000) / 10;
  // Phase-2 rows show the mock-realism score but dimmed so the desk knows it's
  // a projection from the static profile, not real ingestion_runs telemetry.
  const dim = status === "phase_2";
  const liveColor =
    pct >= 99 ? "var(--bid)" : pct >= 95 ? "var(--makor-300)" : pct >= 80 ? "var(--warning)" : "var(--offer)";
  const color = dim ? "var(--text-secondary)" : liveColor;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
      <div
        style={{
          width: 56,
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
            right: `${100 - pct}%`,
            background: color,
          }}
        />
      </div>
      <span
        className="data-sm"
        style={{ color, fontFamily: "var(--font-mono)" }}
      >
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

// =================================================================== FALLBACK CHAIN

function FallbackChain({ row, all }: { row: SourceView; all: SourceView[] }) {
  const chain = buildChain(row, all);
  if (chain.length <= 1 && !row.fallback) {
    return (
      <span className="caption" style={{ color: "var(--text-tertiary)" }}>
        —
      </span>
    );
  }
  return (
    <span
      className="caption"
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 4,
        fontFamily: "var(--font-mono)",
        color: "var(--text-tertiary)",
      }}
    >
      {chain.map((c, i) => (
        <span key={c.name} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          {i > 0 ? <span style={{ color: "var(--text-disabled)" }}>→</span> : null}
          <span
            style={{
              color: c.serving ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: c.serving ? 500 : 400,
            }}
          >
            {c.shortLabel}
          </span>
        </span>
      ))}
    </span>
  );
}

function buildChain(
  row: SourceView,
  all: SourceView[],
): { name: string; shortLabel: string; serving: boolean }[] {
  const chain: { name: string; shortLabel: string; serving: boolean }[] = [];
  let current: SourceView | undefined = row;
  const visited = new Set<string>();
  let servingFound = false;
  while (current && !visited.has(current.name)) {
    visited.add(current.name);
    const isServing =
      !servingFound &&
      (current.status === "live" || current.status === "mock" || current.status === "fallback");
    if (isServing) servingFound = true;
    chain.push({
      name: current.name,
      shortLabel: shortenName(current.name),
      serving: isServing,
    });
    if (!current.fallback) break;
    const nextName: string = current.fallback;
    current = all.find(
      (a) => a.name.toLowerCase().replace(/\s+/g, "_") === nextName ||
             a.name.toLowerCase() === nextName.replace(/_/g, " "),
    );
  }
  return chain;
}

function shortenName(name: string): string {
  return name.replace(/ /g, " ").slice(0, 28);
}

// =================================================================== RELIABILITY FOOTNOTE

function ReliabilityFootnote() {
  return (
    <Card>
      <CardHeader eyebrow="Reliability" title="How this page reads" />
      <CardBody density="premium">
        <div className="editorial-body" style={{ fontSize: 14, lineHeight: "22px", maxWidth: 760 }}>
          <p>
            <strong style={{ color: "var(--text-primary)" }}>Status</strong> reflects the
            adapter's last health probe.
            <Inline color={STATUS_COLOR.live}> LIVE</Inline> means the adapter is running
            on schedule and producing fresh data.
            <Inline color={STATUS_COLOR.degraded}> DEGRADED</Inline> means it's serving but
            stale or partial.
            <Inline color={STATUS_COLOR.fallback}> FALLBACK</Inline> means the primary is
            down and a secondary is serving in its place.
            <Inline color={STATUS_COLOR.mock}> MOCK</Inline> is the Phase-1 deterministic
            generator.
            <Inline color={STATUS_COLOR.phase_2}> PHASE 2</Inline> is scaffolded code with
            no live integration yet.
          </p>
          <p style={{ marginTop: 10 }}>
            <strong style={{ color: "var(--text-primary)" }}>Reliability</strong> shows
            1.0 when the most recent probe returned items and "—" otherwise. Each row
            also carries <code>records_last_run</code> in the table (item count) so the
            desk can see at a glance whether a feed is empty (degraded) or actively
            populated (live).{" "}
            <strong style={{ color: "var(--text-primary)" }}>Fallback chain</strong> is
            only meaningful for sources with declared backup adapters — RSS feeds
            currently degrade rather than fail over, with the affected section dropping
            to a desk-authored frame instead.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

function Inline({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        color,
        textTransform: "uppercase",
        letterSpacing: "0.10em",
        fontWeight: 600,
        fontSize: 10,
        margin: "0 4px",
      }}
    >
      {children}
    </span>
  );
}

// =================================================================== HELPERS

function summarize(sources: SourceView[]) {
  let live = 0, pending = 0, degraded = 0, fallback = 0, mock = 0;
  for (const s of sources) {
    if (s.status === "live") live++;
    else if (s.status === "degraded") degraded++;
    else if (s.status === "fallback") fallback++;
    else if (s.status === "mock") mock++;
    else if (s.status === "phase_2") pending++;
  }
  return { live: live + mock, pending, degraded, fallback };
}

function groupByCategory(sources: SourceView[]) {
  const map = new Map<SourceCategory, SourceView[]>();
  for (const s of sources) {
    if (!map.has(s.category)) map.set(s.category, []);
    map.get(s.category)!.push(s);
  }
  return map;
}
