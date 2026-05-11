import type { BriefingStatus, RiskTone } from "@/lib/types/briefing";
import { Badge } from "./badge";

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

const STATUS_VARIANT: Record<string, "published" | "draft" | "archived" | "failed" | "alert" | "default"> = {
  draft: "draft",
  published: "published",
  archived: "archived",
  failed: "failed",
  alert: "alert",
  neutral: "default",
};

export function StatusPill({ kind, label }: StatusPillProps) {
  const variant = STATUS_VARIANT[kind] ?? "default";
  return <Badge variant={variant}>{label ?? STATUS_LABEL[kind] ?? kind}</Badge>;
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

const RISK_VARIANT: Record<RiskTone, "risk-on" | "risk-off" | "risk-mixed" | "risk-neutral"> = {
  risk_on: "risk-on",
  risk_off: "risk-off",
  mixed: "risk-mixed",
  neutral: "risk-neutral",
};

export function RiskPill({ tone, short = false }: RiskPillProps) {
  return <Badge variant={RISK_VARIANT[tone]}>{short ? RISK_SHORT[tone] : RISK_LABEL[tone]}</Badge>;
}

interface ImportancePillProps {
  importance: string;
}

export function ImportancePill({ importance }: ImportancePillProps) {
  const low = importance.toLowerCase();
  if (low === "high") return <Badge variant="alert">High</Badge>;
  if (low === "med" || low === "medium") return <Badge>Med</Badge>;
  return <Badge variant="archived">Low</Badge>;
}
