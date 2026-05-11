import { Panel, PanelBody, PanelFooter, PanelHeader } from "../ui/Panel";
import { Sparkline, sparkColor } from "../ui/Sparkline";
import { Kbd } from "../ui/Kbd";
import { formatPrice, formatSymbol } from "../../lib/utils/format";
import { syntheticSeries, syntheticTrendDirection } from "../../lib/utils/sparkline";
import type { BriefingRead } from "../../lib/types/briefing";

interface FxMajorsPanelProps {
  briefing: BriefingRead;
}

const ORDER = ["EURUSD", "GBPUSD", "USDJPY", "USDCHF", "AUDUSD", "USDCAD", "NZDUSD"];

export function FxMajorsPanel({ briefing }: FxMajorsPanelProps) {
  const fx = briefing.market_snapshot?.fx ?? {};
  const symbols = ORDER.filter((s) => typeof fx[s] === "number");

  return (
    <Panel>
      <PanelHeader
        eyebrow="FX · G10 Spot"
        title="Majors"
        actions={
          <>
            <span className="caption">As of {briefing.briefing_date}</span>
            <Kbd>F</Kbd>
            <Kbd>X</Kbd>
          </>
        }
      />
      <PanelBody density="flush">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pair</th>
              <th className="col-num">Last</th>
              <th>1W Trend</th>
            </tr>
          </thead>
          <tbody>
            {symbols.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 16, color: "var(--text-tertiary)" }}>
                  No FX snapshot in this briefing.
                </td>
              </tr>
            ) : (
              symbols.map((sym) => {
                const last = fx[sym] as number;
                const dir = syntheticTrendDirection(`${sym}|${briefing.briefing_date}`);
                const direction = dir === 1 ? "pos" : dir === -1 ? "neg" : "neu";
                const series = syntheticSeries(`${sym}|${briefing.briefing_date}`, 12);
                return (
                  <tr key={sym}>
                    <td>{formatSymbol(sym)}</td>
                    <td className="col-num">{formatPrice(sym, last)}</td>
                    <td>
                      <Sparkline points={series} color={sparkColor(direction)} width={96} height={18} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </PanelBody>
      <PanelFooter
        left={`${symbols.length} of ${ORDER.length} majors · briefing date ${briefing.briefing_date}`}
        right={
          <span className="caption" style={{ color: "var(--text-tertiary)" }}>
            Δ ingestion in Phase 2
          </span>
        }
      />
    </Panel>
  );
}
