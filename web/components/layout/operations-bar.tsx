"use client";

import type { ReactNode } from "react";
import { StatusPill, RiskPill } from "@/components/ui/status-pill";
import { relativeFromNow, formatTimeOfDay } from "@/lib/utils/date";
import type { BriefingStatus, RiskTone } from "@/lib/types/briefing";

interface OperationsBarProps {
  briefingDate: string;
  status: BriefingStatus;
  risk: RiskTone;
  generatedAt: string | null;
  sourceHealth: {
    live: number;
    pending: number;
    degraded?: number;
    fallback?: number;
    total: number;
  };
  regimeIntensity?: string;
  actions: ReactNode;
}

/**
 * Dense operational strip stacked beneath the navigation command bar.
 *
 * Surfaces the seven controls the desk uses every morning:
 *   briefing date · status · regime · generation timestamp · source health · regime intensity · actions
 *
 * Sticky at `top: var(--layout-header-h)` so the bar follows the user as
 * they scroll the briefing.
 */
export function OperationsBar({
  briefingDate,
  status,
  risk,
  generatedAt,
  sourceHealth,
  regimeIntensity,
  actions,
}: OperationsBarProps) {
  return (
    <div className="ops-bar">
      <span className="ops-bar-cell">
        <span className="ops-bar-label">Briefing</span>
        <span className="ops-bar-value ops-bar-value-mono">{briefingDate}</span>
      </span>

      <span className="ops-bar-sep" />

      <span className="ops-bar-cell">
        <span className="ops-bar-label">Status</span>
        <StatusPill kind={status} />
      </span>

      <span className="ops-bar-cell">
        <span className="ops-bar-label">Regime</span>
        <RiskPill tone={risk} />
        {regimeIntensity ? (
          <span className="ops-bar-value ops-bar-value-mono" style={{ marginLeft: 4 }}>
            {regimeIntensity}
          </span>
        ) : null}
      </span>

      <span className="ops-bar-sep" />

      <span className="ops-bar-cell">
        <span className="ops-bar-label">Generated</span>
        <span className="ops-bar-value">
          {generatedAt ? (
            <>
              <span className="ops-bar-value-mono">{formatTimeOfDay(generatedAt)}</span>
              <span style={{ color: "var(--text-tertiary)", marginLeft: 4 }}>
                · {relativeFromNow(generatedAt)}
              </span>
            </>
          ) : (
            "—"
          )}
        </span>
      </span>

      <span className="ops-bar-sep" />

      <span className="ops-bar-cell">
        <span className="ops-bar-label">Sources</span>
        <span className="ops-bar-value">
          <SourceCount n={sourceHealth.live} label="live" color="var(--bid)" />
          {sourceHealth.degraded ? (
            <>
              <Sep />
              <SourceCount n={sourceHealth.degraded} label="degraded" color="var(--offer)" />
            </>
          ) : null}
          {sourceHealth.fallback ? (
            <>
              <Sep />
              <SourceCount n={sourceHealth.fallback} label="fallback" color="var(--info)" />
            </>
          ) : null}
          <Sep />
          <SourceCount n={sourceHealth.pending} label="pending" color="var(--warning)" />
          <span style={{ color: "var(--text-tertiary)", marginLeft: 6 }}>
            of {sourceHealth.total}
          </span>
        </span>
      </span>

      <div className="ops-bar-actions">{actions}</div>
    </div>
  );
}

function SourceCount({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <span style={{ color, fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
      {n} {label}
    </span>
  );
}

function Sep() {
  return <span style={{ color: "var(--text-tertiary)", margin: "0 4px" }}>·</span>;
}
