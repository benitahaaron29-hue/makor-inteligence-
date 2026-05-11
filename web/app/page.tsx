import { TerminalHome } from "@/components/terminal/terminal-home";
import { briefingsApi } from "@/lib/api/briefings";
import type { BriefingRead } from "@/lib/types/briefing";

export const dynamic = "force-dynamic";

/**
 * Makor Intelligence Terminal — institutional entry surface.
 *
 * The morning briefing itself lives at /briefings/[date]. This page is the
 * launch terminal: identity panel on the left, dominant launch surface in
 * the center, restrained week-ahead radar on the right. No widgets, no
 * dashboard, no analytics — just the morning gateway to the desk.
 */
export default async function TerminalPage() {
  let latest: BriefingRead | null = null;
  try {
    latest = await briefingsApi.latest();
  } catch {
    latest = null;
  }

  return <TerminalHome latest={latest} todayIso={todayIsoLondon()} />;
}

function todayIsoLondon(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}
