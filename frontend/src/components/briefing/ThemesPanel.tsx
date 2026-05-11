import { Panel, PanelBody, PanelFooter, PanelHeader } from "../ui/Panel";
import { TickerChip } from "../ui/TickerChip";
import type { BriefingRead } from "../../lib/types/briefing";

interface ThemesPanelProps {
  briefing: BriefingRead;
}

export function ThemesPanel({ briefing }: ThemesPanelProps) {
  const themes = briefing.risk_themes ?? [];
  return (
    <Panel>
      <PanelHeader eyebrow="Watchlist" title="Macro Themes" />
      <PanelBody density="premium">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {themes.length === 0 ? (
            <span className="caption" style={{ color: "var(--text-tertiary)" }}>
              No themes recorded.
            </span>
          ) : (
            themes.map((theme, i) => (
              <div
                key={i}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
              >
                <span className="body-sm">{theme}</span>
                <TickerChip direction="neu">▬</TickerChip>
              </div>
            ))
          )}
        </div>
      </PanelBody>
      <PanelFooter left={`${themes.length} active themes`} right={null} />
    </Panel>
  );
}
