/**
 * GET /api/calendar
 *
 * Returns the desk's calendar window — TradingEconomics events for the
 * next 7 days, classified for importance and tagged with a "why this
 * matters for markets" frame where a desk-authored template exists.
 *
 * Optional query params:
 *   filter=desk   — only critical + high (the morning-brief default)
 *
 * Failure shape: always 200; body carries either a populated `events`
 * array or an empty list plus a diagnostic block explaining why.
 * Callers inspect the body, never the HTTP code.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  getCalendarEvents,
  calendarDiagnostics,
} from "@/lib/calendar/service";
import { meetsDeskFilter } from "@/lib/calendar/classifier";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter");

  let events = await getCalendarEvents();
  if (filter === "desk") {
    events = events.filter(meetsDeskFilter);
  }

  return NextResponse.json(
    {
      events,
      count: events.length,
      diagnostics: calendarDiagnostics(),
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
