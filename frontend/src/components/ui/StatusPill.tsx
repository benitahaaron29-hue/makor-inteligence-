import type { BriefingStatus, RiskTone } from "../../lib/types/briefing";

interface StatusPillProps {
  kind: BriefingStatus | "alert" | "neutral";
  label?: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  failed: "Failed",
  alert: "Alert",
  neutral: "—",
};

export function StatusPill({ kind, label }: StatusPillProps) {
  const cls =
    kind === "published" ? "status-pill-published" :
    kind === "draft"     ? "status-pill-draft" :
    kind === "archived"  ? "status-pill-archived" :
    kind === "failed"    ? "status-pill-failed" :
    kind === "alert"     ? "status-pill-alert" :
    "";
  return <span className={`status-pill ${cls}`}>{label ?? STATUS_LABEL[kind] ?? kind}</span>;
}

interface RiskPillProps {
  tone: RiskTone;
  short?: boolean;
}

const RISK_LABEL: Record<RiskTone, string> = {
  risk_on: "Risk-On",
  risk_off: "Risk-Off",
  mixed: "Mixed",
  neutral: "Neutral",
};

const RISK_SHORT: Record<RiskTone, string> = {
  risk_on: "On",
  risk_off: "Off",
  mixed: "Mxd",
  neutral: "Neu",
};

const RISK_CLASS: Record<RiskTone, string> = {
  risk_on: "risk-on",
  risk_off: "risk-off",
  mixed: "risk-mixed",
  neutral: "risk-neutral",
};

export function RiskPill({ tone, short = false }: RiskPillProps) {
  return (
    <span className={`status-pill ${RISK_CLASS[tone]}`}>
      {short ? RISK_SHORT[tone] : RISK_LABEL[tone]}
    </span>
  );
}

interface ImportancePillProps {
  importance: string;
}

export function ImportancePill({ importance }: ImportancePillProps) {
  const low = importance.toLowerCase();
  if (low === "high") return <span className="status-pill status-pill-alert">High</span>;
  if (low === "med" || low === "medium") return <span className="status-pill">Med</span>;
  return <span className="status-pill status-pill-archived">Low</span>;
}
