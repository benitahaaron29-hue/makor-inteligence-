"use client";

import { LiveDot } from "@/components/ui/live-dot";
import { useLiveClock } from "@/lib/hooks/use-live-clock";
import { formatPrice } from "@/lib/utils/format";
import type { MarketSnapshot } from "@/lib/types/briefing";

interface StatusTickerProps {
  snapshot?: MarketSnapshot | null;
}

interface TickerEntry {
  label: string;
  value: number;
  symbol: string;
}

function pick(map: Record<string, number> | undefined, keys: string[]): TickerEntry[] {
  if (!map) return [];
  const out: TickerEntry[] = [];
  for (const key of keys) {
    const v = map[key];
    if (typeof v === "number") out.push({ label: key.replace(/_/g, " "), value: v, symbol: key });
  }
  return out;
}

export function StatusTicker({ snapshot }: StatusTickerProps) {
  const clock = useLiveClock();
  const entries: TickerEntry[] = [
    ...pick(snapshot?.equities, ["SPX", "NDX", "SX5E", "NKY", "FTSE"]),
    ...pick(snapshot?.commodities, ["BRENT", "WTI", "GOLD", "COPPER"]),
    ...pick(snapshot?.rates, ["UST_10Y", "BUND_10Y", "GILT_10Y", "JGB_10Y"]),
    ...pick(snapshot?.fx, ["EURUSD", "GBPUSD", "USDJPY"]),
  ];

  return (
    <div className="status-ticker">
      <span>
        <LiveDot />
        &nbsp;&nbsp;LIVE
      </span>
      <span className="divider-v" />
      {entries.length === 0 ? (
        <span style={{ color: "var(--text-tertiary)" }}>Awaiting briefing snapshot</span>
      ) : (
        entries.map((e) => (
          <span key={e.label}>
            {e.label} <span className="data">{formatPrice(e.symbol, e.value)}</span>
          </span>
        ))
      )}
      <span className="divider-v" />
      <span style={{ marginLeft: "auto" }}>
        Session: London · {clock ? clock.time : "—"}
      </span>
    </div>
  );
}
