/**
 * GET /api/headlines
 *
 * Returns the desk's headline window — the last 24h of public-RSS
 * macro / geopolitical / energy / fiscal headlines, deduped across
 * sources, classified for market relevance, and tagged with a desk-
 * authored "why this matters for markets" frame where one applies.
 *
 * Optional query params:
 *   filter=brief   — only high+medium (the morning-brief default)
 *
 * Failure shape: always 200; body carries `headlines` + per-feed
 * diagnostics. Callers inspect the body, never the HTTP code.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getHeadlines, headlinesDiagnostics } from "@/lib/headlines/service";
import { meetsBriefingFilter } from "@/lib/headlines/classifier";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const filter = url.searchParams.get("filter");

  let headlines = await getHeadlines();
  if (filter === "brief") {
    headlines = headlines.filter(meetsBriefingFilter);
  }

  return NextResponse.json(
    {
      headlines,
      count: headlines.length,
      diagnostics: headlinesDiagnostics(),
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
