import { Panel, PanelBody, PanelHeader } from "../ui/Panel";
import { Sparkline, sparkColor } from "../ui/Sparkline";
import { formatPrice } from "../../lib/utils/format";
import { syntheticSeries, syntheticTrendDirection } from "../../lib/utils/sparkline";
import type { BriefingRead } from "../../lib/types/briefing";

interface RatesCurvePanelProps {
  briefing: BriefingRead;
}

const LABELS: Record<string, string> = {
  UST_2Y: "US 2Y",
  UST_10Y: "US 10Y",
  BUND_10Y: "DE 10Y",
  GILT_10Y: "UK 10Y",
  JGB_10Y: "JP 10Y",
};

const ORDER = ["UST_2Y", "UST_10Y", "BUND_10Y", "GILT_10Y", "JGB_10Y"];

export function RatesCurvePanel({ briefing }: RatesCurvePanelProps) {
  const rates = briefing.market_snapshot?.rates ?? {};
  const keys = ORDER.filter((k) => typeof rates[k] === "number");

  return (
    <Panel>
      <PanelHeader eyebrow="Rates · G7" title="Yield Curve" />
      <PanelBody density="flush">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sovereign</th>
              <th className="col-num">Yield</th>
              <th>Trend</th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: 16, color: "var(--text-tertiary)" }}>
                  No rates snapshot in this briefing.
                </td>
              </tr>
            ) : (
              keys.map((key) => {
                const v = rates[key] as number;
                const dir = syntheticTrendDirection(`${key}|${briefing.briefing_date}`);
                const direction = dir === 1 ? "pos" : dir === -1 ? "neg" : "neu";
                const series = syntheticSeries(`${key}|${briefing.briefing_date}`, 10);
                return (
                  <tr key={key}>
                    <td>{LABELS[key] ?? key}</td>
                    <td className="col-num">{formatPrice(key, v)}</td>
                    <td>
                      <Sparkline points={series} color={sparkColor(direction)} width={88} height={18} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </PanelBody>
    </Panel>
  );
}
