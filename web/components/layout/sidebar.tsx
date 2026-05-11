"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, Home, Plug, Settings, type LucideIcon } from "lucide-react";
import { LiveDot } from "@/components/ui/live-dot";
import { Kbd } from "@/components/ui/kbd";
import { MakorLogo } from "@/components/ui/makor-logo";
import { useLiveClock } from "@/lib/hooks/use-live-clock";
import { cn } from "@/lib/utils";
import type { RiskTone } from "@/lib/types/briefing";

interface SidebarProps {
  regimeTone: RiskTone | null;
  briefingDate: string | null;
}

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

interface NavItemDef {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
}

const NAV: NavItemDef[] = [
  { href: "/",         label: "Terminal",         icon: Home,     exact: true },
  { href: "/archive",  label: "Archive",          icon: Archive },
  { href: "/sources",  label: "Sources",          icon: Plug },
  { href: "/settings", label: "Settings",         icon: Settings },
];

export function Sidebar({ regimeTone, briefingDate }: SidebarProps) {
  const pathname = usePathname();
  const clock = useLiveClock();

  const regimeText = regimeTone ? TONE_LABEL[regimeTone] : "—";
  const regimeColor = regimeTone ? TONE_COLOR[regimeTone] : "var(--text-tertiary)";

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-wordmark">
          <MakorLogo width={108} tone="light" alt="Makor Securities" />
        </div>
        <div className="sidebar-brand-sub">Macro &amp; FX Intelligence</div>
        <div className="sidebar-session">
          <span className="sidebar-session-key">Desk</span>
          <span className="sidebar-session-value">Macro &amp; FX</span>
          <span className="sidebar-session-key">Session</span>
          <span className="sidebar-session-value">LDN · {clock ? clock.time : "—"}</span>
          <span className="sidebar-session-key">Regime</span>
          <span className="sidebar-session-value" style={{ color: regimeColor }}>
            {regimeText}
          </span>
          {briefingDate ? (
            <>
              <span className="sidebar-session-key">Briefing</span>
              <span className="sidebar-session-value">{briefingDate}</span>
            </>
          ) : null}
        </div>
      </div>

      <nav className="sidebar-scroll" aria-label="Primary">
        <div className="sidebar-group">
          {NAV.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("sidebar-item", isActive && "is-active")}
              >
                <Icon size={14} aria-hidden style={{ opacity: 0.65, flex: "0 0 auto" }} />
                <span className="sidebar-item-label">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <span>
            <LiveDot />
            &nbsp;&nbsp;LIVE
          </span>
          <span>{clock ? clock.time : "—"}</span>
        </div>
        <div className="sidebar-footer-row">
          <span style={{ color: "var(--text-tertiary)" }}>A. Benitah · Strategy</span>
          <Kbd>⌘</Kbd>
        </div>

        <div className="sidebar-identity">
          <div className="sidebar-identity-name">MAKOR SECURITIES</div>
          <div className="sidebar-identity-tagline">Institutional FX &amp; Macro Intelligence</div>
          <div className="sidebar-identity-contact">
            <span className="sidebar-identity-line">London · 14 St Helen's Pl · EC3A 6DE</span>
            <span className="sidebar-identity-line">research@makor-group.com</span>
            <span className="sidebar-identity-line">+44 20 7493 8888</span>
            <span className="sidebar-identity-line">makor-group.com</span>
          </div>
          <div className="sidebar-identity-copy">
            © Makor Securities · Confidential
          </div>
        </div>
      </div>
    </aside>
  );
}
