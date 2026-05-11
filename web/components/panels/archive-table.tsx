"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { RiskPill } from "@/components/ui/status-pill";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { BriefingSummary, RiskTone } from "@/lib/types/briefing";

type RiskFilter = "all" | RiskTone;

const RISK_OPTIONS: { value: RiskFilter; label: string }[] = [
  { value: "all", label: "Any" },
  { value: "risk_on", label: "Risk-On" },
  { value: "risk_off", label: "Risk-Off" },
  { value: "mixed", label: "Mixed" },
  { value: "neutral", label: "Neutral" },
];

interface ArchiveTableProps {
  briefings: BriefingSummary[];
  initialQuery?: string;
}

/** Group briefings by year-month so the archive reads like a research archive,
    not a flat blog list. */
function groupByMonth(
  rows: BriefingSummary[],
): { key: string; label: string; rows: BriefingSummary[] }[] {
  const groups: Record<string, BriefingSummary[]> = {};
  for (const b of rows) {
    const key = b.briefing_date.slice(0, 7); // YYYY-MM
    (groups[key] ??= []).push(b);
  }
  const keys = Object.keys(groups).sort().reverse();
  return keys.map((key) => {
    const [y, m] = key.split("-");
    const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });
    return { key, label: monthName, rows: groups[key] ?? [] };
  });
}

export function ArchiveTable({ briefings, initialQuery = "" }: ArchiveTableProps) {
  const [search, setSearch] = useState(initialQuery);
  const [risk, setRisk] = useState<RiskFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return briefings.filter((b) => {
      if (risk !== "all" && b.risk_tone !== risk) return false;
      if (q && !`${b.title} ${b.headline}`.toLowerCase().includes(q)) return false;
      if (dateFrom && b.briefing_date < dateFrom) return false;
      if (dateTo && b.briefing_date > dateTo) return false;
      return true;
    });
  }, [briefings, search, risk, dateFrom, dateTo]);

  const grouped = useMemo(() => groupByMonth(filtered), [filtered]);

  const reset = () => {
    setSearch("");
    setRisk("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="filter-bar">
        <span className="filter-bar-label">Filters</span>
        <span className="filter-bar-sep" />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="caption">Search</span>
          <div style={{ width: 280 }}>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Headline, title, theme…"
            />
          </div>
        </div>

        <span className="filter-bar-sep" />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="caption">From</span>
          <div style={{ width: 144 }}>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              mono
            />
          </div>
          <span className="caption">To</span>
          <div style={{ width: 144 }}>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              mono
            />
          </div>
        </div>

        <span className="filter-bar-sep" />

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="caption">Regime</span>
          <Segmented value={risk} options={RISK_OPTIONS} onChange={setRisk} />
        </div>

        <span style={{ marginLeft: "auto" }} />
        <Button variant="ghost" size="sm" onClick={reset}>
          <X size={12} aria-hidden style={{ marginRight: 4 }} />
          Reset
        </Button>
      </div>

      <Card>
        <CardHeader
          eyebrow="Archive"
          title={`Research Archive · ${filtered.length} of ${briefings.length}`}
          actions={
            <span className="caption" style={{ color: "var(--text-tertiary)" }}>
              {grouped.length} {grouped.length === 1 ? "month" : "months"}
            </span>
          }
        />
        <CardBody density="flush">
          {grouped.length === 0 ? (
            <div style={{ padding: 20, color: "var(--text-tertiary)" }}>
              <span className="body-sm">No briefings match the current filters.</span>
            </div>
          ) : (
            <div>
              {grouped.map((g) => (
                <MonthBlock key={g.key} label={g.label} rows={g.rows} />
              ))}
            </div>
          )}
        </CardBody>
        <CardFooter
          left={`Showing ${filtered.length} of ${briefings.length}`}
          right={
            <span className="caption" style={{ color: "var(--text-tertiary)" }}>
              Sorted by date descending
            </span>
          }
        />
      </Card>
    </div>
  );
}

function MonthBlock({ label, rows }: { label: string; rows: BriefingSummary[] }) {
  return (
    <section>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          background: "var(--surface-raised)",
          borderTop: "1px solid var(--border-default)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <span className="eyebrow">{label}</span>
        <span style={{ flex: 1, height: 1, background: "var(--border-subtle)" }} />
        <span className="caption" style={{ color: "var(--text-tertiary)" }}>
          {rows.length} {rows.length === 1 ? "briefing" : "briefings"}
        </span>
      </div>
      <table className="data-table">
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td className="col-num" style={{ width: 120 }}>
                {b.briefing_date}
              </td>
              <td>
                <Link
                  href={`/briefings/${b.briefing_date}`}
                  style={{ color: "var(--text-primary)", display: "block" }}
                >
                  {b.title}
                </Link>
                <span className="caption" style={{ color: "var(--text-tertiary)" }}>
                  {b.headline}
                </span>
              </td>
              <td
                className="caption"
                style={{ color: "var(--text-secondary)", width: 120 }}
              >
                {b.briefing_type.replace(/_/g, " ")}
              </td>
              <td style={{ width: 100 }}>
                <RiskPill tone={b.risk_tone} short />
              </td>
              <td style={{ width: 56 }}>
                <Link
                  href={`/briefings/${b.briefing_date}`}
                  className="caption"
                  style={{
                    color: "var(--text-accent)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  Open
                  <ChevronRight size={12} aria-hidden />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
