/**
 * GET /api/central-banks
 *
 * Returns the desk's central-bank window — the last 14d of statements,
 * minutes, speeches, press conferences and testimony from the five
 * major banks' public RSS feeds, deduped across feeds, classified by
 * kind, with the speaker extracted where the title makes it possible.
 *
 * Optional query params:
 *   bank=Fed       — filter to a single bank (Fed / ECB / BoE / BoJ / SNB)
 *   limit=N        — cap returned count (default 60)
 *
 * Always 200; body carries events + per-feed diagnostics. Empty list on
 * full failure — never fabricated.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getCBEvents, cbDiagnostics } from "@/lib/central-banks/service";
import { CB_SPECS, ALL_BANKS } from "@/lib/central-banks/feeds";
import type { CBName } from "@/lib/central-banks/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const bankParam = url.searchParams.get("bank");
  const limitParam = url.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, Math.min(parseInt(limitParam, 10) || 60, 200)) : 60;

  let events = await getCBEvents();

  if (bankParam) {
    const wanted = ALL_BANKS.find((b) => b.toLowerCase() === bankParam.toLowerCase());
    if (wanted) {
      events = events.filter((e) => e.bank === wanted);
    }
  }

  if (events.length > limit) events = events.slice(0, limit);

  // Surface the bank registry alongside the events so a UI can render
  // the official calendar links without needing a second round-trip.
  const banks = ALL_BANKS.map((b: CBName) => ({
    bank: b,
    name: CB_SPECS[b].name,
    calendar_url: CB_SPECS[b].calendar_url,
    market_impact: CB_SPECS[b].market_impact,
    bias: CB_SPECS[b].bias,
  }));

  return NextResponse.json(
    {
      events,
      count: events.length,
      banks,
      diagnostics: cbDiagnostics(),
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
