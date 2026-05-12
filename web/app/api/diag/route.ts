/**
 * GET /api/diag
 *
 * Runtime diagnostic endpoint. One curl tells you:
 *   - Demo-mode flag (raw env values + resolved boolean)
 *   - Anthropic API key configured? (boolean, never the key itself)
 *   - Last narrative outcome (ok / cache / validate-fail / api-fail /
 *     no-key / demo-mode) + per-field "llm" vs "template" map so an
 *     operator can see at a glance whether the LLM is populating
 *     anything
 *   - Calendar, headlines, central-bank per-feed status
 *   - Vercel deploy metadata (env, region, url)
 *
 * Common scenarios this resolves:
 *
 *   "I set ANTHROPIC_API_KEY but the briefing still looks templated"
 *      → check narrative.key_configured. If false, env-var didn't reach
 *        the runtime (likely a build-cache issue — redeploy WITHOUT
 *        cache). If true but last_result is "api-fail" or
 *        "validate-fail", check last_error.
 *
 *   "Some sections look LLM, others look template"
 *      → check narrative.last_field_sources. Each field is tagged
 *        "llm" or "template". "template" means the LLM returned
 *        "source data insufficient" for that section.
 *
 *   "Headlines are empty"
 *      → check headlines.per_feed[*].ok. A feed-by-feed status surfaces
 *        which RSS source failed and why.
 *
 * Never exposes anything sensitive — only env-var presence (the
 * BOOLEAN of "is the key set"), never the values themselves.
 */

import { NextResponse } from "next/server";
import { demoModeDiagnostics } from "@/lib/api/demo";
import { narrativeDiagnostics } from "@/lib/narrative/service";
import { calendarDiagnostics } from "@/lib/calendar/service";
import { headlinesDiagnostics } from "@/lib/headlines/service";
import { cbDiagnostics } from "@/lib/central-banks/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const narrative = narrativeDiagnostics();
  const calendar = calendarDiagnostics();
  const headlines = headlinesDiagnostics();
  const central_banks = cbDiagnostics();

  return NextResponse.json(
    {
      // --- demo mode ---
      ...demoModeDiagnostics(),

      // --- env presence (never values) ---
      api_origin: process.env.NEXT_PUBLIC_API_ORIGIN ?? null,
      site_url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      anthropic_api_key_configured: narrative.key_configured,
      tradingeconomics_key_configured:
        (process.env.TRADINGECONOMICS_KEY ?? "").trim().length > 0,
      narrative_model_env: process.env.NARRATIVE_MODEL ?? null,

      // --- Vercel deploy metadata ---
      vercel_env: process.env.VERCEL_ENV ?? null,
      vercel_region: process.env.VERCEL_REGION ?? null,
      vercel_url: process.env.VERCEL_URL ?? null,

      // --- per-layer diagnostics ---
      narrative,
      calendar,
      headlines,
      central_banks,

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
