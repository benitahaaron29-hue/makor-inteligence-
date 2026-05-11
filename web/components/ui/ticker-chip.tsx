import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Direction = "pos" | "neg" | "neu";

interface TickerChipProps {
  direction?: Direction;
  children: ReactNode;
  className?: string;
}

export function TickerChip({ direction = "neu", children, className }: TickerChipProps) {
  return (
    <span
      className={cn(
        "ticker-chip",
        direction === "pos" && "ticker-chip-pos",
        direction === "neg" && "ticker-chip-neg",
        direction === "neu" && "ticker-chip-neu",
        className,
      )}
    >
      {children}
    </span>
  );
}
