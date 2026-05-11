import { NavLink } from "react-router-dom";
import type { ReactNode } from "react";
import { LiveDot } from "../ui/LiveDot";
import { Kbd } from "../ui/Kbd";
import { useLiveClock } from "../../lib/hooks/useLiveClock";
import { useLatestBriefing } from "../../lib/hooks/useBriefings";
import type { RiskTone } from "../../lib/types/briefing";

const TONE_LABEL: Record<RiskTone, string> = {
  risk_on: "Risk-On",
  risk_off: "Risk-Off",
  mixed: "Mixed",
  neutral: "Neutral",
};

const TONE_COLOR: Record<RiskTone, string> = {
  risk_on: "var(--bid)",
  risk_off: "var(--offer)",
  mixed: "var(--warning)",
  neutral: "var(--neutral)",
};

interface SidebarItemProps {
  to: string;
  label: string;
  badge?: ReactNode;
  end?: boolean;
}

function SidebarItem({ to, label, badge, end = false }: SidebarItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `sidebar-item ${isActive ? "is-active" : ""}`
      }
    >
      <span className="sidebar-item-label">{label}</span>
      {badge}
    </NavLink>
  );
}

export function Sidebar() {
  const clock = useLiveClock();
  const { data: latest } = useLatestBriefing();

  const tone = latest?.risk_tone;
  const regimeText = tone ? TONE_LABEL[tone] : "—";
  const regimeColor = tone ? TONE_COLOR[tone] : "var(--text-tertiary)";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-row">
          <span className="sidebar-brand-crest" />
          <div>
            <div className="sidebar-brand-name">MAKOR</div>
            <div className="sidebar-brand-sub">Intelligence · FX</div>
          </div>
        </div>
        <div className="sidebar-session">
          <span className="sidebar-session-key">Desk</span>
          <span className="sidebar-session-value">Macro &amp; FX</span>
          <span className="sidebar-session-key">Session</span>
          <span className="sidebar-session-value">LDN · {clock.time}</span>
          <span className="sidebar-session-key">Regime</span>
          <span className="sidebar-session-value" style={{ color: regimeColor }}>
            {regimeText}
          </span>
        </div>
      </div>

      <div className="sidebar-scroll">
        <div className="sidebar-group">
          <div className="sidebar-group-label">Desk</div>
          <SidebarItem
            to="/"
            end
            label="Morning Briefing"
            badge={
              latest ? (
                <span className="sidebar-item-badge">{latest.briefing_date.slice(-2)}</span>
              ) : null
            }
          />
          <SidebarItem
            to="/markets"
            label="Live Markets"
            badge={
              <span className="sidebar-item-badge" aria-hidden>
                <LiveDot />
              </span>
            }
          />
          <SidebarItem to="/calendar" label="Economic Calendar" />
        </div>

        <div className="sidebar-group">
          <div className="sidebar-group-label">Analytics</div>
          <SidebarItem to="/regime" label="FX Regime" />
          <SidebarItem to="/vol" label="Volatility Surface" />
          <SidebarItem to="/themes" label="Macro Themes" />
          <SidebarItem to="/positioning" label="Positioning" />
          <SidebarItem to="/correlations" label="Correlations" />
        </div>

        <div className="sidebar-group">
          <div className="sidebar-group-label">Research</div>
          <SidebarItem to="/notes" label="Strategist Notes" />
          <SidebarItem to="/archive" label="Briefing Archive" />
          <SidebarItem to="/reports" label="Special Reports" />
        </div>

        <div className="sidebar-group">
          <div className="sidebar-group-label">Desk Tools</div>
          <SidebarItem to="/pnl" label="P&L Console" />
          <SidebarItem to="/settings" label="Settings" />
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <span>
            <LiveDot />
            &nbsp;&nbsp;LIVE FEED
          </span>
          <span>{clock.time}</span>
        </div>
        <div className="sidebar-footer-row">
          <span style={{ color: "var(--text-tertiary)" }}>A. Benitah · Strategy</span>
          <Kbd>⌘</Kbd>
        </div>
      </div>
    </aside>
  );
}
