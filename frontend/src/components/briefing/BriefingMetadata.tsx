import { Panel, PanelBody, PanelHeader } from "../ui/Panel";
import { formatTimeOfDay } from "../../lib/utils/date";
import type { BriefingRead } from "../../lib/types/briefing";

interface BriefingMetadataProps {
  briefing: BriefingRead;
}

export function BriefingMetadata({ briefing }: BriefingMetadataProps) {
  return (
    <Panel>
      <PanelHeader eyebrow="Strategist" title="Briefing Metadata" />
      <PanelBody density="premium">
        <div className="sidebar-session" style={{ gridTemplateColumns: "96px 1fr" }}>
          <span className="sidebar-session-key">ID</span>
          <span className="sidebar-session-value" style={{ fontSize: 11 }}>
            {briefing.id}
          </span>
          <span className="sidebar-session-key">Date</span>
          <span className="sidebar-session-value">{briefing.briefing_date}</span>
          <span className="sidebar-session-key">Type</span>
          <span className="sidebar-session-value">{briefing.briefing_type}</span>
          <span className="sidebar-session-key">Status</span>
          <span className="sidebar-session-value" style={{ color: "var(--bid)" }}>
            {briefing.status}
          </span>
          <span className="sidebar-session-key">Risk Tone</span>
          <span className="sidebar-session-value">{briefing.risk_tone}</span>
          <span className="sidebar-session-key">Source</span>
          <span className="sidebar-session-value">{briefing.generation_source}</span>
          <span className="sidebar-session-key">Generator</span>
          <span className="sidebar-session-value">{briefing.generator_version}</span>
          <span className="sidebar-session-key">Author</span>
          <span className="sidebar-session-value">{briefing.author}</span>
          <span className="sidebar-session-key">Desk</span>
          <span className="sidebar-session-value">{briefing.desk}</span>
          <span className="sidebar-session-key">Published</span>
          <span className="sidebar-session-value">
            {briefing.published_at ? formatTimeOfDay(briefing.published_at) : "—"}
          </span>
        </div>
      </PanelBody>
    </Panel>
  );
}
