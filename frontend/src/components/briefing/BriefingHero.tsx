import { Link } from "react-router-dom";
import { Panel, PanelBody, PanelHeader } from "../ui/Panel";
import { RiskPill, StatusPill } from "../ui/StatusPill";
import { LiveDot } from "../ui/LiveDot";
import type { BriefingRead } from "../../lib/types/briefing";
import { formatLongDate, formatTimeOfDay } from "../../lib/utils/date";

interface BriefingHeroProps {
  briefing: BriefingRead;
}

export function BriefingHero({ briefing }: BriefingHeroProps) {
  return (
    <Panel variant="research" highlight>
      <PanelHeader
        premium
        eyebrow={`Morning FX & Macro · ${formatLongDate(briefing.briefing_date)}`}
        title="Daily Briefing"
        actions={
          <>
            <span className="caption">{formatTimeOfDay(briefing.published_at ?? briefing.created_at)}</span>
            <Link to={`/briefings/${briefing.briefing_date}`} className="btn btn-sm">
              Open ⌘O
            </Link>
          </>
        }
      />
      <PanelBody density="editorial">
        <h1 className="editorial-display" style={{ maxWidth: 720 }}>
          {briefing.title}
        </h1>

        <p className="editorial-dek" style={{ marginTop: 16, maxWidth: 720 }}>
          {briefing.headline}
        </p>

        <div className="editorial-meta" style={{ marginTop: 20 }}>
          <span>By {briefing.author}</span>
          <span>{formatLongDate(briefing.briefing_date)} · {formatTimeOfDay(briefing.published_at ?? briefing.created_at)}</span>
          <span>
            <LiveDot />
            &nbsp;<span style={{ color: "var(--bid)" }}>Live</span>
          </span>
        </div>

        <div className="divider-h" style={{ marginTop: 24, marginBottom: 16 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <StatusPill kind={briefing.status} />
          <RiskPill tone={briefing.risk_tone} />
          <span style={{ flex: "1 1 auto" }} />
          <Link to={`/briefings/${briefing.briefing_date}#fx`} className="caption" style={{ color: "var(--text-accent)" }}>FX Commentary →</Link>
          <Link to={`/briefings/${briefing.briefing_date}#rates`} className="caption" style={{ color: "var(--text-accent)" }}>Rates →</Link>
          <Link to={`/briefings/${briefing.briefing_date}#equities`} className="caption" style={{ color: "var(--text-accent)" }}>Equities →</Link>
          <Link to={`/briefings/${briefing.briefing_date}#commodities`} className="caption" style={{ color: "var(--text-accent)" }}>Commodities →</Link>
          <Link to={`/briefings/${briefing.briefing_date}#events`} className="caption" style={{ color: "var(--text-accent)" }}>Key Events →</Link>
        </div>
      </PanelBody>
    </Panel>
  );
}
