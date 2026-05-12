/**
 * GET /api/market/quote/[instrument]
 *
 * Returns a MarketQuote JSON for a single instrument. The path segment
 * accepts either the registry slug ("eurusd", "us10y") or a tolerant
 * variant of the canonical name ("EUR-USD", "US10Y", "us_10y") —
 * resolveInstrument() in the registry handles normalisation.
 *
 * Failure shape: a 200 with `{ value: null, status: "unavailable",
 * error: "..." }`. The HTTP status is always 200 because the absence of
 * a value is itself a successful, meaningful response — the client
 * unconditionally inspects `status` and `error`, never the HTTP code.
 *
 * Status semantics:
 *   live        — fresh (<60s); rare for free feeds
 *   delayed     — ~15m delayed (Yahoo's default for exchange-traded)
 *   stale       — older than expected for this instrument's cadence
 *   unavailable — no source returned a value; the UI shows "data unavailable"
 */

import { NextResponse, type NextRequest } from "next/server";
import { getQuote } from "@/lib/market/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { instrument: string } },
) {
  const quote = await getQuote(params.instrument);
  return NextResponse.json(quote, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
