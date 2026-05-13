/**
 * Build the deterministic context document the LLM sees.
 *
 * The context is the ONLY information source the LLM is permitted to
 * use. Every claim it makes must cite a line in this document. The
 * validator later checks that every citation id exists.
 *
 * Format is deliberately compact + LLM-friendly:
 *   - One line per item with a stable [kind:id] prefix
 *   - Bracketed importance / relevance tags so the LLM can prioritise
 *   - No prose, no rhetoric — pure structured signal
 */

import type { MarketQuote } from "@/lib/market/types";
import type { CalendarEvent } from "@/lib/calendar/types";
import type { Headline } from "@/lib/headlines/types";
import type { CBEvent } from "@/lib/central-banks/types";
import type { GeoEvent } from "@/lib/geopol/types";
import { CB_SPECS, ALL_BANKS } from "@/lib/central-banks/feeds";
import { meetsDeskFilter as calMeetsDeskFilter } from "@/lib/calendar/classifier";
import { meetsBriefingFilter as hlMeetsBriefingFilter } from "@/lib/headlines/classifier";
import { meetsBriefingFilter as geoMeetsBriefingFilter } from "@/lib/geopol/classifier";

export interface ContextDoc {
  /** Raw rendered string passed to the LLM as the user message. */
  text: string;
  /** Counts so the prompt can declare the size of each section. */
  counts: {
    quotes: number;
    calendar: number;
    headlines: number;
    cb_events: number;
    geo_events: number;
  };
  /** Sorted id pools so the validator knows which citations are valid. */
  valid_ids: {
    q: number[];
    cal: number[];
    hl: number[];
    cb: number[];
    geo: number[];
  };
  /** Hash of the context content — used for the LLM-output cache key. */
  hash: string;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function fmtQuote(q: MarketQuote): string {
  if (q.value === null) {
    return `${q.instrument} — data unavailable (${q.error ?? "no source"})`;
  }
  const v = q.unit === "yield" || q.unit === "pct"
    ? `${q.value.toFixed(3)}%`
    : q.unit === "price" && /\//.test(q.instrument)
      ? q.value.toFixed(4)
      : q.value.toFixed(2);
  const delay = q.delay_minutes != null ? `~${q.delay_minutes}m delayed` : q.status;
  return `${q.instrument} = ${v} (${q.source}, ${delay})`;
}

function fmtCalendar(e: CalendarEvent): string {
  const forecast = e.forecast ? ` · forecast ${e.forecast}` : "";
  const previous = e.previous ? ` · prev ${e.previous}` : "";
  return `${e.date} ${e.time} ${e.country} · ${e.event} [${e.importance}/${e.category}]${forecast}${previous}`;
}

function fmtHeadline(h: Headline): string {
  // Headline link anchor + source + category + relevance — never the
  // article body. The LLM produces its OWN summary if it wants to use
  // this line; it never quotes from the article.
  const time = h.published_at.slice(11, 16);
  return `${h.published_at.slice(0, 10)} ${time} ${h.source} · [${h.category}/${h.relevance}] "${h.title}"`;
}

function fmtCBEvent(e: CBEvent): string {
  const speaker = e.speaker ? ` (${e.speaker})` : "";
  return `${e.datetime.slice(0, 10)} ${e.datetime.slice(11, 16)} ${e.bank} · ${e.kind}${speaker} · "${e.title}"`;
}

function fmtGeoEvent(e: GeoEvent): string {
  return `${e.datetime.slice(0, 10)} ${e.datetime.slice(11, 16)} ${e.source} [${e.region}/${e.kind}/${e.relevance}] · "${e.title}"`;
}

// ---------------------------------------------------------------------------
// Hash (FNV-1a, 32-bit) — small + deterministic, enough for cache keys.
// ---------------------------------------------------------------------------

function fnvHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

// ---------------------------------------------------------------------------
// Public builder
// ---------------------------------------------------------------------------

export interface ContextInput {
  date_iso: string;
  quotes: MarketQuote[];
  calendar: CalendarEvent[];
  headlines: Headline[];
  cb_events: CBEvent[];
  geo_events: GeoEvent[];
}

export function buildContext(input: ContextInput): ContextDoc {
  // 1. Filter to desk-relevant items so the LLM doesn't get distracted
  //    by noise. The full feed is still accessible via the section
  //    endpoints — only the briefing context is curated.
  // Stabilisation cap (Phase Stab-1) — trim 12 → 8 across the board.
  // The per-section briefing filter already promoted the highest-signal
  // items first; keeping 8 of each (32 total) is enough material for an
  // institutional brief while shaving 25-35% of input tokens off the
  // LLM call, which translates directly into lower cold-path latency.
  const calendarKept = input.calendar.filter(calMeetsDeskFilter).slice(0, 8);
  const headlinesKept = input.headlines.filter(hlMeetsBriefingFilter).slice(0, 8);
  const cbKept = input.cb_events.slice(0, 8);
  const geoKept = input.geo_events.filter(geoMeetsBriefingFilter).slice(0, 8);

  // 2. Number each kind from 1. The LLM cites against these ids.
  const lines: string[] = [];
  const valid_ids: ContextDoc["valid_ids"] = { q: [], cal: [], hl: [], cb: [], geo: [] };

  lines.push(`TODAY: ${input.date_iso}`);
  lines.push("");

  lines.push("MARKET QUOTES:");
  input.quotes.forEach((q, i) => {
    const id = i + 1;
    valid_ids.q.push(id);
    lines.push(`[q:${id}] ${fmtQuote(q)}`);
  });
  lines.push("");

  lines.push("CALENDAR (next 7 days, desk-relevant only):");
  if (calendarKept.length === 0) {
    lines.push("(none — calendar source unavailable or no desk-relevant events)");
  } else {
    calendarKept.forEach((e, i) => {
      const id = i + 1;
      valid_ids.cal.push(id);
      lines.push(`[cal:${id}] ${fmtCalendar(e)}`);
    });
  }
  lines.push("");

  lines.push("HEADLINES (last 24h, high+medium relevance only):");
  if (headlinesKept.length === 0) {
    lines.push("(none — headline source unavailable or no relevant flow)");
  } else {
    headlinesKept.forEach((h, i) => {
      const id = i + 1;
      valid_ids.hl.push(id);
      lines.push(`[hl:${id}] ${fmtHeadline(h)}`);
    });
  }
  lines.push("");

  lines.push("CENTRAL BANK ACTIVITY (last 14d):");
  if (cbKept.length === 0) {
    lines.push("(none — CB feeds unavailable)");
  } else {
    cbKept.forEach((e, i) => {
      const id = i + 1;
      valid_ids.cb.push(id);
      lines.push(`[cb:${id}] ${fmtCBEvent(e)}`);
    });
  }
  lines.push("");

  lines.push("GEOPOLITICAL / GOVERNMENT EVENTS (last 14d, briefing-relevant only):");
  if (geoKept.length === 0) {
    lines.push("(none — geopolitical feeds unavailable or no briefing-relevant items)");
  } else {
    geoKept.forEach((e, i) => {
      const id = i + 1;
      valid_ids.geo.push(id);
      lines.push(`[geo:${id}] ${fmtGeoEvent(e)}`);
    });
  }
  lines.push("");

  // 3. Desk-authored per-bank framing. Stabilisation cap (Phase Stab-1):
  //    only emit frames for banks that actually have an item in scope
  //    today — listing all 5 every call cost ~500 tokens for no
  //    cross-asset value when the bank had no relevant activity.
  const banksInScope = new Set(cbKept.map((e) => e.bank));
  if (banksInScope.size > 0) {
    lines.push("DESK PER-BANK FRAMES (reference; cite as [cb:N] only when an actual CB activity item is referenced):");
    for (const bank of ALL_BANKS) {
      if (!banksInScope.has(bank)) continue;
      const spec = CB_SPECS[bank];
      lines.push(`- ${spec.bank}: ${spec.market_impact}`);
    }
    lines.push("");
  }

  // 4. Desk-authored per-geopolitical-source framing — same pattern as
  //    the CB frames. Gives the LLM structural context for what each
  //    organisation's actions mean cross-asset, so unclassified press
  //    releases still carry interpretive scaffolding.
  if (geoKept.length > 0) {
    const orgsSeen = new Set(geoKept.map((e) => e.source));
    lines.push("DESK PER-SOURCE FRAMES (reference; cite as [geo:N] only when an actual geopolitical item is referenced):");
    for (const e of geoKept) {
      if (!orgsSeen.has(e.source)) continue;
      orgsSeen.delete(e.source);
      lines.push(`- ${e.source}: ${e.market_impact}`);
    }
  }

  const text = lines.join("\n");
  const hash = fnvHash(text);

  return {
    text,
    counts: {
      quotes: input.quotes.length,
      calendar: calendarKept.length,
      headlines: headlinesKept.length,
      cb_events: cbKept.length,
      geo_events: geoKept.length,
    },
    valid_ids,
    hash,
  };
}
