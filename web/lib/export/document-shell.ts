/**
 * Standalone export-document renderer.
 *
 * Takes a BriefingRead, returns a fully self-contained HTML string that:
 *   - has no Next.js framework chunks, no hydration scripts, no /_next paths
 *   - has no app shell (sidebar / command bar / operations bar / status ticker)
 *   - has no localhost references — absolute URLs use the public share base
 *   - inlines the design-system CSS so the file renders correctly offline
 *   - promotes the @media print stylesheet to always-on so the document
 *     looks like the printed research note (light paper, dark navy text,
 *     institutional masthead, confidential signoff)
 *   - applies page-break protections so the PDF reads cleanly: section
 *     headers stay with their first body block, trade-idea cards / CB
 *     cards / tables never split, orphan/widow lines are suppressed
 *
 * The file is loaded by the GET handler at /briefings/[date]/export.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { BriefingRead } from "@/lib/types/briefing";

let CACHED_CSS: string | null = null;
let CACHED_LOGO_DATA_URI: string | null = null;

/**
 * Read the authoritative Makor logo file and return it as a base64
 * data URI. Cached for the process lifetime — the asset is static.
 * Returns an empty string if the file cannot be found; callers should
 * fall back to the live-site URL in that case.
 */
async function loadLogoDataUri(): Promise<string> {
  if (CACHED_LOGO_DATA_URI !== null) return CACHED_LOGO_DATA_URI;
  const root = process.cwd();
  const candidates = [
    path.join(root, "public/brand/makor-logo.png"),
    path.join(root, "web/public/brand/makor-logo.png"),
  ];
  for (const p of candidates) {
    try {
      const buf = await readFile(p);
      CACHED_LOGO_DATA_URI = `data:image/png;base64,${buf.toString("base64")}`;
      return CACHED_LOGO_DATA_URI;
    } catch {
      /* try next */
    }
  }
  CACHED_LOGO_DATA_URI = "";
  return "";
}

async function loadDesignSystemCss(): Promise<string> {
  if (CACHED_CSS !== null) return CACHED_CSS;
  const root = process.cwd();
  const candidates = [
    [path.join(root, "styles/tokens.css"),     path.join(root, "styles/components.css")],
    [path.join(root, "web/styles/tokens.css"), path.join(root, "web/styles/components.css")],
  ];
  let tokens = "";
  let components = "";
  for (const [t, c] of candidates) {
    try {
      tokens = await readFile(t, "utf8");
      components = await readFile(c, "utf8");
      break;
    } catch {
      /* try next candidate */
    }
  }
  if (!components) {
    CACHED_CSS = "";
    return "";
  }
  const promoted = extractMediaPrintBlock(components);
  CACHED_CSS = [
    "/* === MAKOR DESIGN TOKENS === */",
    tokens,
    "/* === MAKOR COMPONENTS === */",
    components,
    "/* === PRINT RULES PROMOTED TO ALWAYS-ON FOR EXPORT === */",
    promoted,
  ].join("\n\n");
  return CACHED_CSS;
}

/**
 * Pulls the body of the single top-level @media print { ... } block out of
 * components.css. Uses brace counting (not regex) so nested @page / @top-left
 * declarations are handled correctly.
 */
function extractMediaPrintBlock(css: string): string {
  const start = css.indexOf("@media print");
  if (start === -1) return "";
  const open = css.indexOf("{", start);
  if (open === -1) return "";
  let depth = 1;
  let i = open + 1;
  while (i < css.length && depth > 0) {
    const ch = css[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    i++;
  }
  if (depth !== 0) return "";
  return css.slice(open + 1, i - 1);
}

/** Self-contained CSS layered on top of the design system for the export shell. */
const EXPORT_OVERLAY_CSS = `
/* =============================================================================
   EXPORT DOCUMENT OVERLAY — applied last, after tokens + components +
   promoted print rules. Makes the export render correctly on-screen (as a
   light research note) AND print cleanly to PDF.
   ============================================================================= */

:root { color-scheme: light; }

html, body {
  background: #ffffff !important;
  color: #08111F !important;
  margin: 0 !important;
  padding: 0 !important;
  min-width: 0 !important;
  font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

body { display: block !important; }

.export-doc {
  max-width: 920px;
  margin: 0 auto;
  padding: 22mm 16mm;
  background: #ffffff;
}

@media screen and (max-width: 820px) {
  .export-doc { padding: 16mm 10mm; }
}

/* Hide every piece of platform chrome that might leak into the SSR output. */
.export-doc .sidebar,
.export-doc .command-bar,
.export-doc .ops-bar,
.export-doc .status-ticker,
.export-doc .panel-header,
.export-doc .panel-footer,
.export-doc .terminal,
.export-doc .live-dot,
.export-doc .ops-bar-actions,
.export-doc .btn,
.export-doc nav[aria-label="Primary"],
.export-doc aside,
.export-doc .toc { display: none !important; }

/* The institutional masthead + signoff (normally print-only) are now always
   visible inside the export document. */
.export-doc .print-masthead,
.export-doc .print-signoff { display: flex !important; }
.export-doc .print-signoff { display: block !important; }
.export-doc .print-only { display: block !important; }
.export-doc .print-only-inline { display: inline !important; }
.export-doc .print-confidentiality-strip { display: none !important; }

/* External-link colour for occasional <a> elements in the body. */
.export-doc a {
  color: #1F56D1;
  text-decoration: none;
  border-bottom: 1px dotted #C7DAFF;
}
.export-doc a:hover { border-bottom-style: solid; }

/* =============================================================================
   PAGE-BREAK PROTECTIONS — stronger than the live print rules. Prevents
   trade-idea cards, CB cards, tables, callouts and section headers from
   splitting awkwardly across PDF pages.
   ============================================================================= */

.export-doc section {
  page-break-inside: auto;
  break-inside: auto;
}
.export-doc section > header {
  page-break-after: avoid;
  break-after: avoid-page;
}
.export-doc section > header + * {
  page-break-before: avoid;
  break-before: avoid-page;
}

.export-doc .trade-idea,
.export-doc .cb-card,
.export-doc .pair-row,
.export-doc .pos-row,
.export-doc .editorial-takeaways,
.export-doc .editorial-priorities,
.export-doc .editorial-strategist,
.export-doc .editorial-changed,
.export-doc .risk-warning,
.export-doc .consensus-call,
.export-doc .pull-stat,
.export-doc .crossasset-cell,
.export-doc .session-cell,
.export-doc .geopolitical-region {
  page-break-inside: avoid;
  break-inside: avoid;
}

.export-doc .data-table {
  page-break-inside: auto;
  break-inside: auto;
}
.export-doc .data-table thead { display: table-header-group; }
.export-doc .data-table tfoot { display: table-footer-group; }
.export-doc .data-table tr { page-break-inside: avoid; break-inside: avoid; }

.export-doc h1,
.export-doc h2,
.export-doc h3,
.export-doc h4,
.export-doc .heading-3,
.export-doc .heading-4,
.export-doc .editorial-display,
.export-doc .editorial-dek {
  page-break-after: avoid;
  break-after: avoid-page;
  orphans: 3;
  widows: 3;
}

.export-doc p,
.export-doc li,
.export-doc .editorial-body,
.export-doc .editorial-body p {
  orphans: 3;
  widows: 3;
}

/* Trade ideas grid: each card is its own flow island, no awkward splits. */
.export-doc .trade-idea + .trade-idea { margin-top: 14px; }

/* =============================================================================
   PRINT MEDIA — refined page setup for the standalone PDF
   ============================================================================= */

@page {
  size: A4 portrait;
  margin: 18mm 14mm 20mm 14mm;
}

@media print {
  .export-doc { padding: 0 !important; max-width: none; }
  html, body { background: #ffffff !important; }
}
`;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Build the standalone export-document HTML around already-rendered reader
 * markup. The caller is responsible for SSRing <BriefingReader /> into
 * `readerMarkup` (this keeps the react-dom/server import in the route
 * handler, where Next.js permits it).
 */
export async function buildExportDocument(
  briefing: BriefingRead,
  readerMarkup: string,
): Promise<string> {
  const designSystemCss = await loadDesignSystemCss();
  const logoDataUri = await loadLogoDataUri();

  // Substitute the live asset path with the embedded base64 so the saved
  // document renders the real logo offline. The replace covers both
  // `src="/brand/makor-logo.png"` and any normalised variants.
  if (logoDataUri) {
    readerMarkup = readerMarkup
      .replace(/src="\/brand\/makor-logo\.png"/g, `src="${logoDataUri}"`)
      .replace(/src='\/brand\/makor-logo\.png'/g, `src='${logoDataUri}'`);
  }

  const title = `Morning FX & Macro Review · ${briefing.briefing_date} · Makor Securities`;
  const publishedAt = briefing.published_at ?? briefing.created_at;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="generator" content="Makor Intelligence Platform">
<meta name="author" content="Makor Securities · Macro & FX Desk">
<meta name="description" content="${escapeHtml(briefing.headline)}">
<meta name="confidentiality" content="Confidential — for desk distribution only. Not for client redistribution.">
<meta name="published" content="${escapeHtml(publishedAt)}">
<meta name="dcterms.created" content="${escapeHtml(briefing.created_at)}">
<style>
${designSystemCss}
${EXPORT_OVERLAY_CSS}
</style>
</head>
<body>
<main class="export-doc" role="document">${readerMarkup}</main>
</body>
</html>`;
}
