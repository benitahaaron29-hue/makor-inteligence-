"use client";

/**
 * Live market-session bar — Bloomberg-terminal-style bottom status
 * strip showing the seven sessions the desk tracks: London, Paris,
 * New York, Hong Kong, Singapore, Istanbul, Moscow. Each cell carries
 * the local time (live-updated every 30s) and open / pre-open /
 * closed state with a tiny live dot for open sessions.
 *
 * Stab-4.3 — DST-correct via Intl.DateTimeFormat with IANA tz names
 * (Europe/London, America/New_York etc.). Previous version used static
 * UTC offsets which produced London / Paris one hour late during BST /
 * CEST. The browser engine now handles DST transitions automatically.
 *
 * Hidden in print via the existing .no-print rule + the dedicated
 * print-hide on the parent shell so the institutional PDF stays clean.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MarketSession {
  code: string;
  city: string;
  /** IANA timezone — the browser handles DST + offsets correctly. */
  tz: string;
  /** Local open hour (24h, can be fractional e.g. 9.5 = 09:30). */
  open: number;
  /** Local close hour (24h, fractional). */
  close: number;
}

const MARKET_SESSIONS: MarketSession[] = [
  { code: "LDN", city: "London",    tz: "Europe/London",        open: 8,    close: 16.5 },
  { code: "PAR", city: "Paris",     tz: "Europe/Paris",         open: 9,    close: 17.5 },
  { code: "NYC", city: "New York",  tz: "America/New_York",     open: 9.5,  close: 16 },
  { code: "HKG", city: "Hong Kong", tz: "Asia/Hong_Kong",       open: 9.5,  close: 16 },
  { code: "SIN", city: "Singapore", tz: "Asia/Singapore",       open: 9,    close: 17 },
  { code: "IST", city: "Istanbul",  tz: "Europe/Istanbul",      open: 9.5,  close: 18 },
  { code: "MOW", city: "Moscow",    tz: "Europe/Moscow",        open: 10,   close: 18.75 },
];

type SessionState = "open" | "pre" | "closed";

interface ComputedSession {
  code: string;
  city: string;
  local: string;
  state: SessionState;
  label: string;
}

/**
 * Read the local hour-and-minute in a given IANA timezone using the
 * browser's Intl engine. Correct across DST transitions; no manual
 * offset table to maintain.
 */
function localHoursMinutes(tz: string, now: Date): { h: number; m: number; display: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(now);
  const hStr = parts.find((p) => p.type === "hour")?.value ?? "00";
  const mStr = parts.find((p) => p.type === "minute")?.value ?? "00";
  // Some locales render "24" for midnight in 24h mode — normalise.
  const h = hStr === "24" ? 0 : parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  return {
    h,
    m,
    display: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  };
}

function computeMarketSessions(now: Date): ComputedSession[] {
  return MARKET_SESSIONS.map((m) => {
    const { h, m: mm, display } = localHoursMinutes(m.tz, now);
    const localH = h + mm / 60;
    let state: SessionState;
    let label: string;
    if (localH >= m.open && localH < m.close) {
      state = "open";
      label = "open";
    } else if (localH >= m.open - 1 && localH < m.open) {
      state = "pre";
      label = "pre-open";
    } else {
      state = "closed";
      label = "closed";
    }
    return { code: m.code, city: m.city, local: display, state, label };
  });
}

export function MarketSessionBar() {
  // First render uses a deterministic placeholder so the SSR markup
  // matches the initial client hydration. After mount we replace with
  // the live clock and tick every 30 seconds.
  const [sessions, setSessions] = useState<ComputedSession[]>(() =>
    computeMarketSessions(new Date(Date.UTC(2026, 0, 1, 9, 0, 0))),
  );

  useEffect(() => {
    const tick = () => setSessions(computeMarketSessions(new Date()));
    tick(); // immediate update on mount with the actual current time
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="market-session-bar no-print" role="presentation" aria-label="Market sessions">
      {sessions.map((s) => (
        <div key={s.code} className={cn("market-session", `market-session-${s.state}`)}>
          <span className="market-session-code">{s.code}</span>
          <span className="market-session-city">{s.city}</span>
          <span className="market-session-time">{s.local}</span>
          <span className={cn("market-session-state", `market-session-state-${s.state}`)}>
            {s.label}
          </span>
        </div>
      ))}
    </div>
  );
}
