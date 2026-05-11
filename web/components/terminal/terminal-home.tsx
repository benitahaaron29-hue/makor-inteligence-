"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { MakorLogo } from "@/components/ui/makor-logo";
import { GenerateButton } from "@/components/layout/generate-button";
import { useLiveClock } from "@/lib/hooks/use-live-clock";
import type { BriefingRead } from "@/lib/types/briefing";

interface TerminalHomeProps {
  latest: BriefingRead | null;
  /** Server-resolved London date for "today" — stable across hydration. */
  todayIso: string;
}

interface WeekEvent {
  day: string;       // "Mon" / "Tue" …
  date: string;      // "12 May"
  time: string;      // "13:30" / "—"
  region: string;    // "US" / "EZ" / "UK"
  category: string;  // matches category-cat-* classes
  event: string;
  weight: "p1" | "p2";
}

const TONE_LABEL: Record<string, string> = {
  risk_on: "Risk-On",
  risk_off: "Risk-Off",
  mixed: "Mixed",
  neutral: "Neutral",
};

const TONE_COLOR: Record<string, string> = {
  risk_on: "var(--bid)",
  risk_off: "var(--offer)",
  mixed: "var(--warning)",
  neutral: "var(--neutral)",
};

export function TerminalHome({ latest, todayIso }: TerminalHomeProps) {
  const router = useRouter();
  const clock = useLiveClock();
  const [date, setDate] = useState<string>(latest?.briefing_date ?? todayIso);

  const isToday = date === todayIso;
  const latestIsToday = latest?.briefing_date === todayIso;
  const week = useMemo(() => buildWeekAhead(todayIso), [todayIso]);

  const dateHeadline = formatHeadlineDate(date);
  const dateSubline = formatSublineDate(date);

  const onOpen = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/briefings/${date}`);
  };

  const publishedLine = (() => {
    if (!latest) return "No briefing published yet";
    const t = (latest.published_at ?? latest.created_at).slice(11, 16);
    return latestIsToday
      ? `Published · ${t} GMT · ${TONE_LABEL[latest.risk_tone] ?? "—"}`
      : `Latest · ${latest.briefing_date} · ${t} GMT`;
  })();

  return (
    <section className="terminal" aria-label="Makor Intelligence Terminal">
      {/* =============================== LEFT — IDENTITY */}
      <aside className="terminal-left">
        <div className="terminal-brand">
          <MakorLogo width={148} tone="light" alt="Makor Securities" />
        </div>
        <div className="terminal-brand-tagline">
          Institutional FX &amp; Macro Intelligence
        </div>

        <div className="terminal-divider" aria-hidden />

        <dl className="terminal-meta">
          <div className="terminal-meta-row">
            <dt>London</dt>
            <dd>
              <span className="terminal-meta-time">{clock ? clock.time : "—"}</span>
              <span className="terminal-meta-zone">BST</span>
            </dd>
          </div>
          <div className="terminal-meta-row">
            <dt>Session</dt>
            <dd>{clock ? clock.date : todayIso}</dd>
          </div>
          <div className="terminal-meta-row">
            <dt>Desk</dt>
            <dd>Macro &amp; FX · Research</dd>
          </div>
          <div className="terminal-meta-row">
            <dt>Regime</dt>
            <dd style={{ color: latest ? TONE_COLOR[latest.risk_tone] : "var(--text-tertiary)" }}>
              {latest ? TONE_LABEL[latest.risk_tone] : "—"}
            </dd>
          </div>
        </dl>

        <div className="terminal-descriptor">
          Pre-market desk terminal — opens the morning review before the
          London session.
        </div>
      </aside>

      {/* =============================== CENTER — LAUNCH SURFACE */}
      <div className="terminal-center">
        <div className="terminal-eyebrow">
          <span>Makor · Morning Desk</span>
          <span className="terminal-eyebrow-sep">/</span>
          <span>Morning FX &amp; Macro Review</span>
        </div>

        <h1 className="terminal-date">{dateHeadline}</h1>
        <div className="terminal-date-sub">{dateSubline}</div>

        <div className="terminal-status">
          <span className={`terminal-status-dot ${latest ? "is-live" : "is-off"}`} aria-hidden />
          <span>{publishedLine}</span>
        </div>

        <form onSubmit={onOpen} className="terminal-launch">
          <label className="terminal-date-field">
            <span className="terminal-date-label">Review date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={todayIso}
              className="terminal-date-input"
              aria-label="Briefing date"
            />
          </label>

          <div className="terminal-actions">
            <Button type="submit" variant="primary" size="lg" className="terminal-cta-primary">
              {isToday ? "Open Morning Review" : `Open Review · ${date}`}
              <ArrowUpRight size={14} aria-hidden style={{ marginLeft: 6 }} />
            </Button>
            <GenerateButton
              variant="default"
              size="lg"
              label={latestIsToday ? "Regenerate Today's Briefing" : "Generate Today's Briefing"}
            />
          </div>
        </form>

        <div className="terminal-footnotes">
          <span>
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
            <span className="terminal-footnote-text">Open command palette</span>
          </span>
          <span className="terminal-footnote-sep" aria-hidden />
          <Link href="/archive" className="terminal-footnote-link">
            Browse archive
          </Link>
          <span className="terminal-footnote-sep" aria-hidden />
          <Link href="/sources" className="terminal-footnote-link">
            Source health
          </Link>
        </div>
      </div>

      {/* =============================== RIGHT — THIS WEEK */}
      <aside className="terminal-right">
        <div className="terminal-radar-head">
          <span className="terminal-radar-eyebrow">This Week</span>
          <span className="terminal-radar-sub">Macro radar · LDN session</span>
        </div>

        <ol className="terminal-radar">
          {week.map((ev) => (
            <li key={ev.day} className={`terminal-radar-row ${ev.weight === "p1" ? "is-p1" : ""}`}>
              <div className="terminal-radar-day">
                <span className="terminal-radar-dow">{ev.day}</span>
                <span className="terminal-radar-date">{ev.date}</span>
              </div>
              <div className="terminal-radar-event">
                <div className="terminal-radar-event-line">{ev.event}</div>
                <div className="terminal-radar-event-meta">
                  <span className="terminal-radar-time">{ev.time}</span>
                  <span className={`category-badge ${categoryClass(ev.category)}`}>
                    {categoryLabel(ev.category)}
                  </span>
                  <span className="terminal-radar-region">{ev.region}</span>
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="terminal-radar-foot">
          Curated week-ahead · expands once the calendar adapter lands
        </div>
      </aside>
    </section>
  );
}

// =========================================================================
// Helpers
// =========================================================================

function formatHeadlineDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
}

function formatSublineDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString("en-GB", {
    year: "numeric",
    timeZone: "UTC",
  }) + " · Morning FX & Macro Review";
}

const CATEGORY_LABELS: Record<string, string> = {
  monetary: "Central Bank",
  inflation: "Inflation",
  growth: "Growth",
  labour: "Labour",
  auction: "Auction",
  policy: "Policy",
  political: "Political",
  geopolitical: "Geopolitical",
};

function categoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat;
}

function categoryClass(cat: string): string {
  return `category-cat-${cat}`;
}

/**
 * Curated week-ahead radar — anchored on today's date so the days surface
 * Mon-Fri of the current institutional week. Replaced by the calendar
 * adapter in Phase 2.
 */
function buildWeekAhead(todayIso: string): WeekEvent[] {
  const [y, m, d] = todayIso.split("-").map(Number);
  const today = new Date(Date.UTC(y, m - 1, d));
  // Monday of this week (Mon = 1)
  const dow = today.getUTCDay(); // Sun=0, Mon=1, ...
  const offsetToMon = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() + offsetToMon);

  const fmtDow = (dt: Date) =>
    dt.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" });
  const fmtDate = (dt: Date) =>
    dt.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

  const dayAt = (idx: number) => {
    const dt = new Date(monday);
    dt.setUTCDate(monday.getUTCDate() + idx);
    return { day: fmtDow(dt), date: fmtDate(dt) };
  };

  // Five institutional anchors for an FX/macro week. Order Mon → Fri.
  return [
    {
      ...dayAt(0),
      time: "09:30",
      region: "UK",
      category: "political",
      event: "PM · Mansion House preview address",
      weight: "p1",
    },
    {
      ...dayAt(1),
      time: "10:00",
      region: "DE",
      category: "growth",
      event: "ZEW survey · sentiment & expectations",
      weight: "p2",
    },
    {
      ...dayAt(2),
      time: "19:00",
      region: "US",
      category: "monetary",
      event: "FOMC minutes · April meeting",
      weight: "p1",
    },
    {
      ...dayAt(3),
      time: "13:30",
      region: "US",
      category: "inflation",
      event: "US CPI · April · core & headline",
      weight: "p1",
    },
    {
      ...dayAt(4),
      time: "07:00",
      region: "UK",
      category: "growth",
      event: "UK Q1 GDP · prelim release",
      weight: "p2",
    },
  ];
}
