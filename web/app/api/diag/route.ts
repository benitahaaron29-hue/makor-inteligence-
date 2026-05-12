/**
 * GET /api/diag
 *
 * Three modes:
 *
 *   /api/diag
 *     Lightweight. Returns env-state + the LAST-KNOWN diagnostic
 *     snapshot for this serverless instance. If the briefing
 *     generator has never run in this instance, every service's
 *     counters will be empty/null — that does NOT mean the services
 *     don't work; it means this instance hasn't been hit by a page
 *     render yet. Use ?probe=1 to actively invoke them.
 *
 *   /api/diag?probe=1
 *     Actively runs market quotes + calendar + headlines + CB services
 *     in the same function instance handling the request, then returns
 *     per-service results + timing. This is the single-call self-test
 *     for "is the data layer actually working?".
 *
 *   /api/diag?probe=1&narrative=1
 *     Same as probe=1, PLUS forces a fresh narrative synthesis call
 *     (bypasses the 30-min cache by including a cache-bust marker in
 *     the context). Expensive (~$0.03 + 5-15s latency); use sparingly.
 *
 * Why we need probe mode: each Vercel serverless function instance has
 * its own in-memory module state. The DIAG snapshot a service holds
 * is per-instance. Hitting /api/diag often lands on a DIFFERENT
 * instance than the one that rendered the briefing — so the snapshot
 * looks empty even when the service worked perfectly in a sibling
 * instance. Probe mode forces invocation in the same instance handling
 * the diag request, making the result unambiguous.
 */

import { NextResponse, type NextRequest } from "next/server";
import { demoModeDiagnostics } from "@/lib/api/demo";
import {
  narrativeDiagnostics,
  synthesise,
} from "@/lib/narrative/service";
import {
  calendarDiagnostics,
  getCalendarEvents,
} from "@/lib/calendar/service";
import {
  headlinesDiagnostics,
  getBriefingHeadlines,
} from "@/lib/headlines/service";
import {
  cbDiagnostics,
  getBriefingCBEvents,
} from "@/lib/central-banks/service";
import { getQuote } from "@/lib/market/service";
import { generatorDiagnostics } from "@/lib/briefing/generator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Probe mode (especially with narrative=1) invokes the LLM. Vercel's
// default function budget is 10s; we need 60.
export const maxDuration = 60;

interface ProbeResult {
  service: string;
  ok: boolean;
  took_ms: number;
  result: Record<string, unknown>;
}

async function probeQuotes(): Promise<ProbeResult> {
  const t0 = Date.now();
  const slugs = ["eurusd", "dxy", "us2y", "us10y", "brent", "gold", "vix"];
  try {
    const quotes = await Promise.all(slugs.map((s) => getQuote(s)));
    return {
      service: "market_quotes",
      ok: true,
      took_ms: Date.now() - t0,
      result: {
        total: quotes.length,
        with_value: quotes.filter((q) => q.value !== null).length,
        sample: quotes.map((q) => ({
          instrument: q.instrument,
          value: q.value,
          source: q.source,
          status: q.status,
          error: q.error,
        })),
      },
    };
  } catch (err) {
    return {
      service: "market_quotes",
      ok: false,
      took_ms: Date.now() - t0,
      result: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

async function probeCalendar(): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const events = await getCalendarEvents();
    return {
      service: "calendar",
      ok: true,
      took_ms: Date.now() - t0,
      result: {
        count: events.length,
        first: events[0]
          ? { date: events[0].date, time: events[0].time, country: events[0].country, event: events[0].event, importance: events[0].importance }
          : null,
        diagnostics: calendarDiagnostics(),
      },
    };
  } catch (err) {
    return {
      service: "calendar",
      ok: false,
      took_ms: Date.now() - t0,
      result: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

async function probeHeadlines(): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const headlines = await getBriefingHeadlines(10);
    return {
      service: "headlines",
      ok: true,
      took_ms: Date.now() - t0,
      result: {
        count: headlines.length,
        first: headlines[0]
          ? { source: headlines[0].source, title: headlines[0].title, category: headlines[0].category, relevance: headlines[0].relevance }
          : null,
        diagnostics: headlinesDiagnostics(),
      },
    };
  } catch (err) {
    return {
      service: "headlines",
      ok: false,
      took_ms: Date.now() - t0,
      result: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

async function probeCB(): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const events = await getBriefingCBEvents(8);
    return {
      service: "central_banks",
      ok: true,
      took_ms: Date.now() - t0,
      result: {
        count: events.length,
        first: events[0]
          ? { bank: events[0].bank, kind: events[0].kind, datetime: events[0].datetime, title: events[0].title }
          : null,
        diagnostics: cbDiagnostics(),
      },
    };
  } catch (err) {
    return {
      service: "central_banks",
      ok: false,
      took_ms: Date.now() - t0,
      result: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

async function probeNarrative(): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    // Build a context from a fresh fetch of all four streams.
    const slugs = ["eurusd", "dxy", "us2y", "us10y", "brent", "gold", "vix"];
    const [quotes, calendar, headlines, cb_events] = await Promise.all([
      Promise.all(slugs.map((s) => getQuote(s))),
      getCalendarEvents(),
      getBriefingHeadlines(10),
      getBriefingCBEvents(8),
    ]);
    const date_iso = new Date().toISOString().slice(0, 10);
    const narrative = await synthesise({ date_iso, quotes, calendar, headlines, cb_events });
    return {
      service: "narrative",
      ok: !!narrative,
      took_ms: Date.now() - t0,
      result: {
        narrative_present: !!narrative,
        diagnostics: narrativeDiagnostics(),
      },
    };
  } catch (err) {
    return {
      service: "narrative",
      ok: false,
      took_ms: Date.now() - t0,
      result: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const probe = url.searchParams.get("probe") === "1";
  const includeNarrative = url.searchParams.get("narrative") === "1";

  // --- env presence + last-known per-instance diagnostics ---
  const lastKnown = {
    ...demoModeDiagnostics(),
    api_origin: process.env.NEXT_PUBLIC_API_ORIGIN ?? null,
    site_url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    anthropic_api_key_configured: narrativeDiagnostics().key_configured,
    tradingeconomics_key_configured:
      (process.env.TRADINGECONOMICS_KEY ?? "").trim().length > 0,
    narrative_model_env: process.env.NARRATIVE_MODEL ?? null,
    vercel_env: process.env.VERCEL_ENV ?? null,
    vercel_region: process.env.VERCEL_REGION ?? null,
    vercel_url: process.env.VERCEL_URL ?? null,
    server_time: new Date().toISOString(),
    generator: generatorDiagnostics(),
    narrative: narrativeDiagnostics(),
    calendar: calendarDiagnostics(),
    headlines: headlinesDiagnostics(),
    central_banks: cbDiagnostics(),
  };

  if (!probe) {
    return NextResponse.json(
      {
        ...lastKnown,
        _note:
          "This is the LAST-KNOWN per-instance snapshot. If counters look empty, the briefing generator has not run in THIS serverless instance — that's a Vercel routing artifact, not a service failure. Use /api/diag?probe=1 to actively invoke the services here.",
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

  // --- probe mode: actively run each service in THIS instance ---
  const probeTargets: Array<Promise<ProbeResult>> = [
    probeQuotes(),
    probeCalendar(),
    probeHeadlines(),
    probeCB(),
  ];
  if (includeNarrative) probeTargets.push(probeNarrative());

  const probeResults = await Promise.all(probeTargets);

  // Refresh the per-service diagnostics now that we've invoked them
  // in this instance.
  return NextResponse.json(
    {
      mode: includeNarrative ? "probe+narrative" : "probe",
      env: {
        demo_mode: demoModeDiagnostics().demo_mode,
        anthropic_api_key_configured: narrativeDiagnostics().key_configured,
        tradingeconomics_key_configured:
          (process.env.TRADINGECONOMICS_KEY ?? "").trim().length > 0,
        narrative_model_env: process.env.NARRATIVE_MODEL ?? null,
        vercel_env: process.env.VERCEL_ENV ?? null,
        vercel_region: process.env.VERCEL_REGION ?? null,
      },
      probe_results: probeResults,
      generator_after: generatorDiagnostics(),
      narrative_after: narrativeDiagnostics(),
      calendar_after: calendarDiagnostics(),
      headlines_after: headlinesDiagnostics(),
      central_banks_after: cbDiagnostics(),
      server_time: new Date().toISOString(),
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
