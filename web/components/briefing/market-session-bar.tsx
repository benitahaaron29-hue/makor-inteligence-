"use client";

/**
 * Live market-session bar — Bloomberg-terminal-style bottom status
 * strip showing the seven sessions the desk tracks: London, Paris,
 * New York, Hong Kong, Singapore, Istanbul, Moscow. Each cell carries
 * the local time (live-updated every 30s) and open / pre-open /
 * closed state with a tiny live dot for open sessions.
 *
 * Rendered as a client component so the clocks actually advance after
 * first paint. The setInterval ticks every 30s — fine-grained enough
 * to look live, slow enough to be cheap. Hidden in print via the
 * existing .no-print rule + the dedicated print-hide on the parent
 * shell so the institutional PDF stays clean.
 */

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface MarketSession {
  code: string;
  city: string;
  /** Tz offset hours from UTC. DST handled coarsely — desk-time orientation only. */
  offset: number;
  /** Local open hour. */
  open: number;
  /** Local close hour. */
  close: number;
}

const MARKET_SESSIONS: MarketSession[] = [
  { code: "LDN", city: "London",    offset: 0,  open: 8,    close: 16.5 },
  { code: "PAR", city: "Paris",     offset: 1,  open: 9,    close: 17.5 },
  { code: "NYC", city: "New York",  offset: -5, open: 9.5,  close: 16 },
  { code: "HKG", city: "Hong Kong", offset: 8,  open: 9.5,  close: 16 },
  { code: "SIN", city: "Singapore", offset: 8,  open: 9,    close: 17 },
  { code: "IST", city: "Istanbul",  offset: 3,  open: 9.5,  close: 18 },
  { code: "MOW", city: "Moscow",    offset: 3,  open: 10,   close: 18.75 },
];

type SessionState = "open" | "pre" | "closed";

interface ComputedSession {
  code: string;
  city: string;
  local: string;
  state: SessionState;
  label: string;
}

function computeMarketSessions(now: Date): ComputedSession[] {
  const utcH = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  return MARKET_SESSIONS.map((m) => {
    let localH = (utcH + m.offset) % 24;
    if (localH < 0) localH += 24;
    const hh = Math.floor(localH);
    const mm = Math.floor((localH - hh) * 60);
    const local = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
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
    return { code: m.code, city: m.city, local, state, label };
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
