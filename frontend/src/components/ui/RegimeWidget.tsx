import { Sparkline, sparkColor } from "./Sparkline";
import type { RiskTone } from "../../lib/types/briefing";
import { syntheticSeries } from "../../lib/utils/sparkline";

interface RegimeWidgetProps {
  tone: RiskTone;
  intensity?: string;
  seed: string;
}

const TONE_LABEL: Record<RiskTone, string> = {
  risk_on: "Risk-On",
  risk_off: "Risk-Off",
  mixed: "Mixed",
  neutral: "Neutral",
};

const TONE_CLASS: Record<RiskTone, string> = {
  risk_on: "regime-on",
  risk_off: "regime-off",
  mixed: "regime-mixed",
  neutral: "",
};

export function RegimeWidget({ tone, intensity, seed }: RegimeWidgetProps) {
  const sparkDir = tone === "risk_on" ? "pos" : tone === "risk_off" ? "neg" : "neu";
  const series = syntheticSeries(`regime|${seed}|${tone}`, 10);
  return (
    <div className={`regime-widget ${TONE_CLASS[tone]}`}>
      <span className="regime-widget-mark" />
      <div className="regime-widget-body">
        <span className="regime-widget-label">Desk Regime</span>
        <span className="regime-widget-value">
          {TONE_LABEL[tone]}{intensity ? ` · ${intensity}` : ""}
        </span>
      </div>
      <Sparkline points={series} color={sparkColor(sparkDir)} width={56} height={20} />
    </div>
  );
}
