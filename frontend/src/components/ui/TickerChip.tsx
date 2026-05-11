import type { ReactNode } from "react";

type Direction = "pos" | "neg" | "neu";

interface TickerChipProps {
  direction?: Direction;
  children: ReactNode;
}

export function TickerChip({ direction = "neu", children }: TickerChipProps) {
  const cls =
    direction === "pos" ? "ticker-chip-pos" :
    direction === "neg" ? "ticker-chip-neg" :
    "ticker-chip-neu";
  return <span className={`ticker-chip ${cls}`}>{children}</span>;
}

export function directionFromValue(v: number): Direction {
  if (v > 0) return "pos";
  if (v < 0) return "neg";
  return "neu";
}
