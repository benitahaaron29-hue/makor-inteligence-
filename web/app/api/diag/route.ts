/**
 * GET /api/diag
 *
 * Runtime diagnostic endpoint. Returns the exact env-var values the
 * running deployment sees, the resolved demo_mode flag, and a server
 * timestamp. Use this to verify whether a Vercel env-var change has
 * actually taken effect in the live build.
 *
 *   curl https://<deployment>.vercel.app/api/diag
 *
 * Why this exists:
 *
 *   NEXT_PUBLIC_* env vars are inlined at BUILD TIME by Next.js. If a
 *   Vercel redeploy serves a cached build artifact, a freshly-changed
 *   NEXT_PUBLIC_DEMO_MODE will NOT reach the running code — the inlined
 *   literal still carries the old value. DEMO_MODE (without the prefix)
 *   is read at RUNTIME and avoids this trap. /api/diag shows you both
 *   raw values + the resolved decision so you can tell which path is
 *   active without guessing.
 *
 * The endpoint is intentionally noindex/nofollow and serves nothing
 * sensitive — only env-var presence and the demo-mode boolean, never
 * an auth token or upstream secret.
 */

import { NextResponse } from "next/server";
import { demoModeDiagnostics } from "@/lib/api/demo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(
    {
      ...demoModeDiagnostics(),
      api_origin: process.env.NEXT_PUBLIC_API_ORIGIN ?? null,
      site_url: process.env.NEXT_PUBLIC_SITE_URL ?? null,
      vercel_env: process.env.VERCEL_ENV ?? null,
      vercel_region: process.env.VERCEL_REGION ?? null,
      vercel_url: process.env.VERCEL_URL ?? null,
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
