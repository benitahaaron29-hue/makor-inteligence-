import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CommandBar } from "../components/layout/CommandBar";
import { Panel, PanelBody, PanelFooter, PanelHeader } from "../components/ui/Panel";
import { RiskPill, StatusPill } from "../components/ui/StatusPill";
import { Segmented } from "../components/ui/Segmented";
import { ErrorState, LoadingState } from "../components/ui/States";
import { useGenerateBriefing, useRecentBriefings } from "../lib/hooks/useBriefings";
import type { BriefingStatus, RiskTone } from "../lib/types/briefing";

type StatusFilter = "all" | BriefingStatus;
type RiskFilter = "all" | RiskTone;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const RISK_OPTIONS: { value: RiskFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "risk_on", label: "Risk-On" },
  { value: "risk_off", label: "Risk-Off" },
  { value: "mixed", label: "Mixed" },
  { value: "neutral", label: "Neutral" },
];

export function ArchivePage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [risk, setRisk] = useState<RiskFilter>("all");

  const { data, isPending, error, refetch } = useRecentBriefings(200);
  const generate = useGenerateBriefing();

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      if (risk !== "all" && b.risk_tone !== risk) return false;
      if (q && !`${b.title} ${b.headline}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, status, risk]);

  return (
    <>
      <CommandBar
        crumbs={[
          { label: "Research" },
          { label: "Briefing Archive" },
        ]}
        leftExtras={
          <span className="caption">
            {data ? `${data.length} records` : "—"}
          </span>
        }
        rightActions={
          <>
            <button type="button" className="btn">Export · CSV</button>
            <button type="button" className="btn">Export · PDF</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => generate.mutate({ overwrite: true, publish: true })}
              disabled={generate.isPending}
            >
              + {generate.isPending ? "Generating…" : "New Briefing"}
            </button>
          </>
        }
      />

      <div className="workspace">
        <div className="col-span-12">
          <div className="filter-bar">
            <span className="filter-bar-label">Filters</span>
            <span className="filter-bar-sep" />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="caption">Search</span>
              <div className="input-with-affix" style={{ width: 260 }}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Headline, title…"
                />
              </div>
            </div>
            <span className="filter-bar-sep" />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="caption">Status</span>
              <Segmented value={status} options={STATUS_OPTIONS} onChange={setStatus} />
            </div>
            <span className="filter-bar-sep" />
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span className="caption">Regime</span>
              <Segmented value={risk} options={RISK_OPTIONS} onChange={setRisk} />
            </div>
            <span style={{ marginLeft: "auto" }} />
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { setSearch(""); setStatus("all"); setRisk("all"); }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className="col-span-12">
          {isPending ? (
            <LoadingState label="Loading archive…" />
          ) : error ? (
            <ErrorState
              title="Could not load archive"
              message={error instanceof Error ? error.message : "Unknown error"}
              onRetry={() => refetch()}
            />
          ) : (
            <Panel>
              <PanelHeader
                eyebrow="Archive"
                title={`All Briefings · ${filtered.length} of ${data?.length ?? 0}`}
              />
              <PanelBody density="flush">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Headline</th>
                      <th>Type</th>
                      <th className="col-center">Risk</th>
                      <th className="col-center">Status</th>
                      <th>Author</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: 16, color: "var(--text-tertiary)" }}>
                          No briefings match the current filters.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((b) => (
                        <tr key={b.id}>
                          <td className="col-num">{b.briefing_date}</td>
                          <td>
                            <Link to={`/briefings/${b.briefing_date}`} style={{ color: "var(--text-primary)" }}>
                              {b.title}
                            </Link>
                          </td>
                          <td>{b.briefing_type.replace(/_/g, " ")}</td>
                          <td className="col-center">
                            <RiskPill tone={b.risk_tone} short />
                          </td>
                          <td className="col-center">
                            <StatusPill kind={b.status} />
                          </td>
                          <td className="caption">—</td>
                          <td>
                            <Link to={`/briefings/${b.briefing_date}`} className="caption" style={{ color: "var(--text-accent)" }}>
                              Open ↗
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </PanelBody>
              <PanelFooter
                left={`Showing ${filtered.length} of ${data?.length ?? 0}`}
                right={null}
              />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
