/**
 * GET /briefings/[date]/export
 *
 * Returns a fully self-contained HTML document for the requested briefing —
 * no Next.js framework chunks, no /_next paths, no app shell, no localhost
 * references. Suitable for offline distribution, browser-side "Save as PDF",
 * and email attachment.
 *
 * The response is sent with Content-Disposition: attachment so the browser
 * triggers a download rather than navigating to the document.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createElement } from "react";

import { BriefingReader } from "@/components/briefing/briefing-reader";
import { generateBriefingShell } from "@/lib/briefing/generator";
import { isDemoMode } from "@/lib/api/demo";
import { briefingsApi } from "@/lib/api/briefings";
import { buildExportDocument } from "@/lib/export/document-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Stab-3 — the export route now uses the shell path, which probes the
// in-memory narrative cache instead of firing a fresh LLM call. Warm
// cache → narrative inlined; cold cache → template content. Either way
// the route returns in single-digit seconds and never approaches the
// 60s Vercel Hobby budget, eliminating the FUNCTION_INVOCATION_TIMEOUT
// pattern that was breaking exports.
export const maxDuration = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } },
) {
  const date = params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new NextResponse("Invalid date format. Expected YYYY-MM-DD.", { status: 400 });
  }

  // Lightweight export path. The export is a static document so the
  // client hydrator cannot run later. The shell generator probes the
  // narrative cache (synchronous in-memory lookup, no LLM call) so warm-
  // cache exports get full narrative content inline, while cold-cache
  // exports gracefully degrade to template content. Either way: no
  // upstream LLM dependency in the export critical path.
  let briefing;
  try {
    briefing = isDemoMode()
      ? await briefingsApi.byDate(date)
      : await generateBriefingShell(date);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return new NextResponse(`Briefing fetch failed: ${msg}`, { status: 502 });
  }

  if (!briefing) {
    return new NextResponse("Briefing not found.", { status: 404 });
  }

  let readerMarkup: string;
  try {
    // Dynamic import so Next.js's SWC plugin doesn't flag the static
    // react-dom/server import. Route handlers are always server-side.
    const { renderToStaticMarkup } = await import("react-dom/server");
    readerMarkup = renderToStaticMarkup(createElement(BriefingReader, { briefing }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Render failed";
    return new NextResponse(`Briefing render failed: ${msg}`, { status: 500 });
  }

  const html = await buildExportDocument(briefing, readerMarkup);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="makor-briefing-${date}.html"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
