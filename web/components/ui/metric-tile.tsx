import type { ReactNode } from "react";

interface MetricTileProps {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  valueColor?: "primary" | "pos" | "neg" | "neu" | "warn";
}

const COLOR: Record<NonNullable<MetricTileProps["valueColor"]>, string> = {
  primary: "var(--text-data)",
  pos: "var(--bid)",
  neg: "var(--offer)",
  neu: "var(--neutral)",
  warn: "var(--warning)",
};

export function MetricTile({ label, value, delta, valueColor = "primary" }: MetricTileProps) {
  return (
    <div className="metric-tile">
      <span className="metric-tile-label">{label}</span>
      <span className="metric-tile-value" style={{ color: COLOR[valueColor] }}>{value}</span>
      {delta ? <span className="metric-tile-delta">{delta}</span> : null}
    </div>
  );
}
