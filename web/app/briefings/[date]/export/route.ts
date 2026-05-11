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
import { briefingsApi } from "@/lib/api/briefings";
import { buildExportDocument } from "@/lib/export/document-shell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } },
) {
  const date = params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new NextResponse("Invalid date format. Expected YYYY-MM-DD.", { status: 400 });
  }

  let briefing;
  try {
    briefing = await briefingsApi.byDate(date);
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
