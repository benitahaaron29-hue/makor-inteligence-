import { useLatestBriefing } from "../../lib/hooks/useBriefings";
import { useLiveClock } from "../../lib/hooks/useLiveClock";
import { LiveDot } from "../ui/LiveDot";
import { formatPrice } from "../../lib/utils/format";

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
    if (typeof v === "number") {
      out.push({ label: key.replace(/_/g, " "), value: v, symbol: key });
    }
  }
  return out;
}

export function StatusTicker() {
  const { data: briefing } = useLatestBriefing();
  const clock = useLiveClock();

  const snap = briefing?.market_snapshot;
  const entries: TickerEntry[] = [
    ...pick(snap?.equities, ["SPX", "NDX", "SX5E", "NKY", "FTSE"]),
    ...pick(snap?.commodities, ["BRENT", "WTI", "GOLD", "COPPER"]),
    ...pick(snap?.rates, ["UST_10Y", "BUND_10Y", "GILT_10Y", "JGB_10Y"]),
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
      <span style={{ marginLeft: "auto" }}>Session: London · {clock.time}</span>
    </div>
  );
}
