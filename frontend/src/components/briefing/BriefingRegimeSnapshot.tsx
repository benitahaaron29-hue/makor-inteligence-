import { Panel, PanelBody, PanelHeader } from "../ui/Panel";
import { RiskPill } from "../ui/StatusPill";
import { TickerChip } from "../ui/TickerChip";
import { Kbd } from "../ui/Kbd";
import { formatTimeOfDay } from "../../lib/utils/date";
import type { BriefingRead } from "../../lib/types/briefing";

interface BriefingRegimeSnapshotProps {
  briefing: BriefingRead;
}

export function BriefingRegimeSnapshot({ briefing }: BriefingRegimeSnapshotProps) {
  const themes = briefing.risk_themes.slice(0, 4);
  return (
    <Panel>
      <PanelHeader
        eyebrow="Regime · Today"
        title="Macro Snapshot"
        actions={
          <>
            <Kbd>R</Kbd>
            <Kbd>G</Kbd>
          </>
        }
      />
      <PanelBody density="premium">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Row label="Risk Sentiment" value={<RiskPill tone={briefing.risk_tone} />} />
          <Row label="Generator" value={<span className="caption">{briefing.generator_version}</span>} />
          <Row label="Status" value={<span className="caption" style={{ color: "var(--bid)" }}>{briefing.status}</span>} />
          <Row label="Source" value={<span className="caption">{briefing.generation_source}</span>} />
          {themes.length > 0 ? (
            <>
              <div className="divider-h" />
              <div className="eyebrow">Active Themes</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {themes.map((t, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="body-sm">{t}</span>
                    <TickerChip direction="neu">▬</TickerChip>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
        <div className="divider-h" />
        <p className="caption" style={{ lineHeight: "18px" }}>
          Briefing snapshot composed {formatTimeOfDay(briefing.published_at ?? briefing.created_at)}.
          Real market regime model lands in Phase 2.
        </p>
      </PanelBody>
    </Panel>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <span className="eyebrow">{label}</span>
      {value}
    </div>
  );
}
