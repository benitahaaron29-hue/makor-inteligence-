"use client";

import { useEffect, useState } from "react";

export interface LiveClock {
  time: string;
  date: string;
  iso: string;
}

const DESK_TZ = "Europe/London";

function format(now: Date): LiveClock {
  return {
    time: now.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: DESK_TZ,
      hour12: false,
    }),
    date: now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: DESK_TZ,
    }),
    iso: now.toISOString(),
  };
}

export function useLiveClock(intervalMs = 1000): LiveClock | null {
  // Returns null on initial server render to avoid hydration mismatches.
  const [clock, setClock] = useState<LiveClock | null>(null);

  useEffect(() => {
    setClock(format(new Date()));
    const id = window.setInterval(() => setClock(format(new Date())), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return clock;
}
