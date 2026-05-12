/**
 * Generic RSS/Atom adapter.
 *
 * Parses the upstream XML with a regex-based extractor (no extra
 * dependency). Robust enough for the well-formed RSS 2.0 and Atom feeds
 * we target; it handles CDATA sections, common HTML entities, and
 * <item> / <entry> alternate element names.
 *
 * We deliberately extract ONLY:
 *   - title    (the link anchor — factual short headline)
 *   - link     (href to the original article — reader follows for body)
 *   - pubDate  (or Atom <updated>)
 *
 * Article body / RSS <description> is INTENTIONALLY NOT captured. Our
 * value-add is the desk-authored market-impact frame attached at the
 * classifier layer, not reproduction of upstream prose.
 */

import type { Headline } from "../types";
import { headlineId } from "../classifier";

const FETCH_TIMEOUT_MS = 5_000;

export interface FeedSpec {
  /** Display source name shown in the UI ("AP" / "BBC" / "Reuters"). */
  source: string;
  /** Public RSS or Atom URL. */
  url: string;
}

// ---------------------------------------------------------------------------
// Entity decoding — minimal, covers what well-formed feeds emit.
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : "";
    })
    .replace(/&([a-z]+);/gi, (whole, name) => NAMED_ENTITIES[name.toLowerCase()] ?? whole);
}

function stripCdata(input: string): string {
  return input.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1");
}

function stripTags(input: string): string {
  return input.replace(/<[^>]+>/g, "");
}

function cleanText(input: string): string {
  return decodeEntities(stripTags(stripCdata(input))).replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Tag extraction — anchored on the item/entry slice, tolerant of attrs.
// ---------------------------------------------------------------------------

function extractFirst(slice: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = slice.match(re);
  return m ? cleanText(m[1]) : null;
}

/** Atom <link href="..."/> — self-closing or with body. */
function extractAtomHref(slice: string): string | null {
  const re = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i;
  const m = slice.match(re);
  return m ? decodeEntities(m[1]).trim() : null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function fetchFeed(feed: FeedSpec): Promise<Headline[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(feed.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MakorIntelligence/1.0)",
        Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
      },
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${feed.source} network: ${msg}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw new Error(`${feed.source} HTTP ${res.status}`);
  }

  const xml = await res.text();
  if (!xml || xml.length < 32) {
    throw new Error(`${feed.source}: empty feed`);
  }

  return parseFeed(xml, feed.source);
}

export function parseFeed(xml: string, source: string): Headline[] {
  const headlines: Headline[] = [];
  const fetchedAt = new Date().toISOString();

  // Try RSS <item> first; fall back to Atom <entry>.
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  const entryRe = /<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;

  const collect = (re: RegExp, atom: boolean) => {
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml)) !== null) {
      const body = m[1];
      const title = extractFirst(body, "title");
      if (!title) continue;

      const link = atom
        ? extractAtomHref(body) ?? extractFirst(body, "id")
        : extractFirst(body, "link");
      if (!link || !/^https?:\/\//i.test(link)) continue;

      const dateStr =
        (atom ? extractFirst(body, "updated") ?? extractFirst(body, "published") : extractFirst(body, "pubDate")) ??
        new Date().toUTCString();

      const parsed = Date.parse(dateStr);
      const published_at = Number.isFinite(parsed)
        ? new Date(parsed).toISOString()
        : new Date().toISOString();

      headlines.push({
        id: headlineId(source, title),
        title,
        // category/relevance/market_impact left as defaults — service
        // re-classifies before returning. We never publish raw RSS
        // description body; the WHY frame is our editorial layer.
        category: "other",
        relevance: "low",
        market_impact: null,
        published_at,
        source,
        source_url: link,
        fetched_at: fetchedAt,
      });
    }
  };

  collect(itemRe, false);
  if (headlines.length === 0) collect(entryRe, true);

  return headlines;
}
