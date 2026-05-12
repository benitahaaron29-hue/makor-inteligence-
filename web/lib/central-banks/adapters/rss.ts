/**
 * Central-bank RSS adapter.
 *
 * Fetches one bank's feed and returns CBEvent[] — title + link + pubDate
 * normalised, classifier applied for kind + speaker, market-impact frame
 * attached from the per-bank registry. We extract ONLY the link anchor +
 * link + publication time; the upstream <description> body is never
 * captured.
 *
 * Parser is intentionally local (not imported from headlines) so the
 * two phases stay independently maintainable. ~80 LOC of duplication
 * is the right trade.
 */

import type { CBEvent, CBSpec } from "../types";
import { CB_SPECS } from "../feeds";
import { classifyKind, extractSpeaker, cbEventId } from "../classifier";

const FETCH_TIMEOUT_MS = 5_000;

// ---------------------------------------------------------------------------
// Entity / CDATA / tag helpers (duplicated from headlines/adapters for
// phase isolation; keep them in sync if the markup conventions evolve).
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'",
  nbsp: " ", ndash: "–", mdash: "—", hellip: "…",
  rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
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

function extractFirst(slice: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = slice.match(re);
  return m ? cleanText(m[1]) : null;
}

function extractAtomHref(slice: string): string | null {
  const re = /<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?>/i;
  const m = slice.match(re);
  return m ? decodeEntities(m[1]).trim() : null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

async function fetchXml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MakorIntelligence/1.0)",
        Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, */*;q=0.8",
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!text || text.length < 32) throw new Error("empty feed");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchCBFeed(spec: CBSpec, feedUrl: string): Promise<CBEvent[]> {
  let xml: string;
  try {
    xml = await fetchXml(feedUrl);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`${spec.name}: ${msg}`);
  }

  const events: CBEvent[] = [];
  const fetchedAt = new Date().toISOString();

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
        (atom
          ? extractFirst(body, "updated") ?? extractFirst(body, "published")
          : extractFirst(body, "pubDate") ?? extractFirst(body, "dc:date")) ??
        new Date().toUTCString();

      const parsed = Date.parse(dateStr);
      const datetime = Number.isFinite(parsed)
        ? new Date(parsed).toISOString()
        : new Date().toISOString();

      const kind = classifyKind(title);
      const speaker = kind === "speech" || kind === "press-conf" || kind === "testimony"
        ? extractSpeaker(title)
        : null;

      events.push({
        id: cbEventId(spec.bank, datetime, title),
        bank: spec.bank,
        kind,
        datetime,
        is_future: false,
        speaker,
        title,
        source: spec.name,
        source_url: link,
        market_impact: spec.market_impact,
        fetched_at: fetchedAt,
      });
    }
  };

  collect(itemRe, false);
  if (events.length === 0) collect(entryRe, true);

  return events;
}

/** Convenience: fetch every feed configured for a bank. */
export async function fetchAllForBank(spec: CBSpec): Promise<CBEvent[]> {
  const results = await Promise.allSettled(spec.feeds.map((f) => fetchCBFeed(spec, f.url)));
  const events: CBEvent[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") events.push(...r.value);
  }
  return events;
}

/** Expose the bank's spec for the service / generator layers. */
export function specFor(bank: CBSpec["bank"]): CBSpec {
  return CB_SPECS[bank];
}
