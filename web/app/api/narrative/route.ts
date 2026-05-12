/**
 * GET /api/narrative
 *
 * On-demand narrative synthesis endpoint. Pulls today's market quotes,
 * calendar, headlines, and CB activity (same sources the briefing
 * generator uses), assembles the context document, and calls Claude.
 *
 * Use cases:
 *   - Operator introspection ("did the LLM produce valid JSON today?")
 *   - Manual re-fetch when the 30-min cache should be busted
 *   - Future direct embed by a separate UI
 *
 * Failure shape: always 200; body carries either the validated
 * NarrativeOutput or { narrative: null } plus the diagnostic block
 * explaining why (demo-mode / no-key / api-fail / validate-fail).
 */

import { NextResponse, type NextRequest } from "next/server";
import { synthesise, narrativeDiagnostics } from "@/lib/narrative/service";
import { getQuote } from "@/lib/market/service";
import { getCalendarEvents } from "@/lib/calendar/service";
import { getBriefingHeadlines } from "@/lib/headlines/service";
import { getBriefingCBEvents } from "@/lib/central-banks/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Anthropic responses typically settle in 5-15s; the route handler may
// need a longer window than Vercel's default 10s for cold-cache calls.
export const maxDuration = 60;

export async function GET(_req: NextRequest) {
  const slugs = ["eurusd", "dxy", "us2y", "us10y", "brent", "gold", "vix"];
  const [quotes, calendarEvents, headlines, cbEvents] = await Promise.all([
    Promise.all(slugs.map((s) => getQuote(s))),
    getCalendarEvents(),
    getBriefingHeadlines(10),
    getBriefingCBEvents(8),
  ]);

  const date_iso = new Date().toISOString().slice(0, 10);
  const narrative = await synthesise({ date_iso, quotes, calendar: calendarEvents, headlines, cb_events: cbEvents });

  return NextResponse.json(
    {
      narrative,
      diagnostics: narrativeDiagnostics(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
