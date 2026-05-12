/**
 * Rule-based event classifier.
 *
 * Three outputs per event:
 *
 *   importance      — critical / high / medium / low / unknown
 *   category        — inflation / labour / monetary / growth / auction /
 *                     political / geopolitical / policy / survey / other
 *   market_impact   — short editorial frame: "why this matters for markets"
 *                     authored at the desk level for ~15 high-frequency
 *                     patterns. Null for unmatched events (honest signal
 *                     that no template applies; Phase 2.4 LLM can fill
 *                     from context).
 *
 * Design choices:
 *   - Pattern lists are deterministic regex. Easy to audit, no AI dependency.
 *   - Critical patterns OVERRIDE the upstream's numeric importance. The
 *     upstream (TradingEconomics) often marks Fed Chair speakers as level 2
 *     — for an institutional desk those are critical events.
 *   - Two intelligence layers are covered:
 *       Layer 1 (markets): inflation, labour, monetary, growth, auctions
 *       Layer 2 (geopolitical/political): G7/G20, OPEC, prime-ministerial
 *         and finance-ministerial speeches, sanctions, election milestones
 *   - The filter "could this realistically move FX, rates, commodities,
 *     or global risk sentiment today?" is what separates critical/high
 *     from medium/low. Anything below high should not anchor the
 *     desk's day.
 */

import type { CalendarEvent, EventImportance } from "./types";

// ---------------------------------------------------------------------------
// Country normalisation — TradingEconomics returns full English names.
// ---------------------------------------------------------------------------

const COUNTRY_TO_SHORT: Record<string, string> = {
  "united states": "US",
  "euro area": "EZ",
  "european union": "EZ",
  "united kingdom": "UK",
  "japan": "JP",
  "switzerland": "CH",
  "china": "CN",
  "canada": "CA",
  "australia": "AU",
  "new zealand": "NZ",
  "germany": "DE",
  "france": "FR",
  "italy": "IT",
  "spain": "ES",
  "netherlands": "NL",
  "norway": "NO",
  "sweden": "SE",
  "denmark": "DK",
  "south korea": "KR",
  "india": "IN",
  "brazil": "BR",
  "mexico": "MX",
  "saudi arabia": "SA",
  "turkey": "TR",
  "russia": "RU",
};

export function normaliseCountry(raw: string | null | undefined): string {
  if (!raw) return "—";
  const k = raw.trim().toLowerCase();
  return COUNTRY_TO_SHORT[k] ?? raw.trim();
}

// ---------------------------------------------------------------------------
// Critical patterns. These ALWAYS classify as critical regardless of the
// upstream's importance number. Each carries a short market-impact frame.
// ---------------------------------------------------------------------------

interface Pattern {
  re: RegExp;
  category: string;
  impact?: string;
}

const CRITICAL_PATTERNS: Pattern[] = [
  {
    re: /\bcore\s+(CPI|PCE)\b/i,
    category: "inflation",
    impact:
      "Front-end USD curve binary. Hot surprise re-prices Fed cuts later — 2y yields up, dollar bid. Soft surprise sends front-end receiving and reverses recent dollar gains.",
  },
  {
    re: /\bCPI\b(?!.*forecast)/i,
    category: "inflation",
    impact:
      "Inflation print drives the front-end USD curve and the dollar. Markets read the m/m core number more than the y/y headline.",
  },
  {
    re: /\bnon[\s-]?farm\s+payrolls?\b|\bNFP\b/i,
    category: "labour",
    impact:
      "Primary labour-market read for the Fed reaction function. Strong print flattens the curve and bids the dollar; weak print sends the front end receiving.",
  },
  {
    re: /\bunemployment\s+rate\b/i,
    category: "labour",
    impact:
      "Sahm-rule input — tail-risk gauge for the Fed pace. A 0.1pp surprise versus consensus is enough to move the front end.",
  },
  {
    re: /\bFOMC.*(rate\s+decision|interest\s+rate|policy)\b|\bFed\s+(rate|funds\s+rate)\s+decision\b/i,
    category: "monetary",
    impact:
      "Rate decision plus SEP plus press conference. Entire USD curve, DXY, USD/JPY, S&P duration all react. Forward-guidance language is the variable, not the rate level itself.",
  },
  {
    re: /\b(ECB|euro\s+area).*(rate\s+decision|interest\s+rate|deposit\s+rate)\b/i,
    category: "monetary",
    impact:
      "ECB rate decision plus QT framing. EUR + Bund curve binary. The press conference language on neutral rate carries more weight than the headline move.",
  },
  {
    re: /\bBoE\b.*(rate\s+decision|bank\s+rate)\b|\bbank\s+of\s+england.*rate\b/i,
    category: "monetary",
    impact:
      "BoE rate decision + vote split. GBP + Gilt curve. The dissent count is the variable; markets price the path off the split, not the headline.",
  },
  {
    re: /\bBoJ\b.*(rate|policy)\b|\bbank\s+of\s+japan.*decision\b/i,
    category: "monetary",
    impact:
      "BoJ rate decision + YCC commentary. USD/JPY + 10y JGB. Surprise hike or yield-cap shift can trigger global rate-vol contagion.",
  },
  {
    re: /\bFOMC\s+minutes\b/i,
    category: "monetary",
    impact:
      "Look for dissent count + neutral-rate framing. Front-end re-prices on hawkish/dovish surprise versus the post-meeting press conference tone.",
  },
  {
    re: /\bjackson\s+hole\b/i,
    category: "monetary",
    impact:
      "Annual Fed symposium; Chair's keynote sets the policy-framework signal. Multi-asset reaction across the entire complex.",
  },
];

// ---------------------------------------------------------------------------
// High patterns. Watched by the desk but not always traded.
// ---------------------------------------------------------------------------

const HIGH_PATTERNS: Pattern[] = [
  {
    re: /\bGDP\b.*\b(advance|preliminary|prelim|q\d|first|second|third)\b/i,
    category: "growth",
    impact:
      "Growth read; conditions the central-bank reaction function. Surprise > 0.2pp moves the currency.",
  },
  {
    re: /\bmanufacturing\s+PMI\b|\bISM\s+manufacturing\b/i,
    category: "growth",
    impact:
      "Forward-looking activity proxy. Sub-50 prints feed recession-risk premium into the front end; new-orders sub-index is the leading signal.",
  },
  {
    re: /\bservices\s+PMI\b|\bISM\s+services\b/i,
    category: "growth",
    impact:
      "Dominant US activity component. The services prices-paid sub-index is a sticky-inflation tell.",
  },
  {
    re: /\bretail\s+sales\b/i,
    category: "growth",
    impact:
      "Consumer read. Control-group ex-autos/gas is the desk-relevant number.",
  },
  {
    re: /\bIndustrial\s+Production\b/i,
    category: "growth",
  },
  {
    re: /\b(10|30|7|5|2)[\s-]?year\s+(note\s+|bond\s+)?auction\b/i,
    category: "auction",
    impact:
      "Long-end supply concession; indirect-bid signal. A tail wider than +1bp re-prices the long end and stresses duration positioning.",
  },
  {
    re: /\b(Fed|Federal\s+Reserve)\s+(chair|chairman|chairwoman|powell)\b/i,
    category: "monetary",
    impact:
      "Fed Chair on the wire — the highest-impact non-decision speaker for the front end. Any deviation from the post-FOMC press-conference framing is the trade.",
  },
  {
    re: /\bECB\s+(president|lagarde)\b/i,
    category: "monetary",
    impact:
      "ECB President — primary euro-side rate-path catalyst between Governing Council meetings.",
  },
  {
    re: /\bnon[\s-]?manufacturing\s+PMI\b/i,
    category: "growth",
  },
  {
    re: /\bPCE\b(?!.*core)/i,
    category: "inflation",
    impact:
      "Fed's preferred inflation measure. Less surprising than CPI but anchors the next FOMC's framing.",
  },
  {
    re: /\bADP\s+employment\b/i,
    category: "labour",
    impact:
      "Two-day-ahead NFP proxy. Recent correlation has been weak; useful as a directional hint, not a forecast.",
  },
  {
    re: /\binitial\s+jobless\s+claims\b/i,
    category: "labour",
    impact:
      "Weekly labour-market high-frequency read. A move above the 4-week average matters; single prints are noise.",
  },
  // Layer 2 — geopolitical / political
  {
    re: /\b(G[\s-]?7|G[\s-]?20|NATO)\s+(summit|meeting|communiqu[ée]|leaders)\b/i,
    category: "geopolitical",
    impact:
      "Coordination signal on tariffs, sanctions, defence spending. Communiqué language affects USD reserve sentiment + cross-border capital flows.",
  },
  {
    re: /\bOPEC\b/i,
    category: "geopolitical",
    impact:
      "Production decision sets the front-month Brent curve. Cuts back-loaded into 2H tend to bid the prompt; surprise increases sell the curve.",
  },
  {
    re: /\b(prime\s+minister|chancellor|president|finance\s+minister|treasury\s+secretary)\b.*\b(speech|address|remarks|statement|press\s+conference|parliament)\b/i,
    category: "political",
    impact:
      "Head-of-government / finance-ministerial commentary. Watch for fiscal-rule language, tariff signalling, and FX-policy framing.",
  },
  {
    re: /\b(sanctions?|tariff|trade\s+deal|trade\s+war)\b/i,
    category: "geopolitical",
    impact:
      "Trade-policy headline; immediate read-through to the targeted currency, energy, and equity sector flows.",
  },
];

// ---------------------------------------------------------------------------
// Medium patterns. Standard releases that occasionally surprise.
// ---------------------------------------------------------------------------

const MEDIUM_PATTERNS: Pattern[] = [
  { re: /\btrade\s+balance\b/i, category: "growth" },
  { re: /\bbusiness\s+(climate|confidence)\b/i, category: "survey" },
  { re: /\bconsumer\s+confidence\b/i, category: "survey" },
  { re: /\bZEW\b/i, category: "survey" },
  { re: /\bIfo\b/i, category: "survey" },
  { re: /\bhousing\s+starts\b/i, category: "growth" },
  { re: /\bbuilding\s+permits\b/i, category: "growth" },
  { re: /\bexisting\s+home\s+sales\b/i, category: "growth" },
  { re: /\bnew\s+home\s+sales\b/i, category: "growth" },
  { re: /\bdurable\s+goods\b/i, category: "growth" },
  { re: /\bcurrent\s+account\b/i, category: "growth" },
];

// ---------------------------------------------------------------------------
// Category fallback — when no pattern matched, use the upstream category
// string to make a best-effort categorisation. Returns "other" if unknown.
// ---------------------------------------------------------------------------

function categoriseFromUpstream(raw: string | null | undefined): string {
  if (!raw) return "other";
  const lower = raw.toLowerCase();
  if (lower.includes("inflation") || lower.includes("cpi") || lower.includes("pce") || lower.includes("ppi")) return "inflation";
  if (lower.includes("unemployment") || lower.includes("employment") || lower.includes("payroll") || lower.includes("labour") || lower.includes("labor")) return "labour";
  if (lower.includes("interest rate") || lower.includes("monetary") || lower.includes("central bank")) return "monetary";
  if (lower.includes("gdp") || lower.includes("pmi") || lower.includes("retail") || lower.includes("industrial")) return "growth";
  if (lower.includes("auction") || lower.includes("bond")) return "auction";
  if (lower.includes("trade") || lower.includes("balance")) return "growth";
  if (lower.includes("housing") || lower.includes("home")) return "growth";
  if (lower.includes("confidence") || lower.includes("sentiment") || lower.includes("survey")) return "survey";
  return "other";
}

// ---------------------------------------------------------------------------
// Public API.
// ---------------------------------------------------------------------------

export interface ClassificationInput {
  /** Event name as published by upstream. */
  event: string;
  /** Upstream-provided category (e.g. TradingEconomics "Category" field). */
  category?: string | null;
  /** Upstream-provided importance level (TradingEconomics: 1, 2, or 3). */
  upstream_importance?: number | null;
}

export interface ClassificationResult {
  importance: EventImportance;
  category: string;
  market_impact: string | null;
}

export function classifyEvent(input: ClassificationInput): ClassificationResult {
  const event = input.event ?? "";

  // 1. Critical patterns override any upstream importance.
  for (const p of CRITICAL_PATTERNS) {
    if (p.re.test(event)) {
      return { importance: "critical", category: p.category, market_impact: p.impact ?? null };
    }
  }

  // 2. High patterns.
  for (const p of HIGH_PATTERNS) {
    if (p.re.test(event)) {
      return { importance: "high", category: p.category, market_impact: p.impact ?? null };
    }
  }

  // 3. Medium patterns (category only, no market_impact frame).
  for (const p of MEDIUM_PATTERNS) {
    if (p.re.test(event)) {
      return { importance: "medium", category: p.category, market_impact: null };
    }
  }

  // 4. Upstream importance + best-effort category. The upstream's 3 may
  //    indicate "high" but the desk's WHY frame is absent — that's honest.
  const ui = input.upstream_importance ?? 0;
  let importance: EventImportance;
  if (ui >= 3) importance = "high";
  else if (ui === 2) importance = "medium";
  else if (ui === 1) importance = "low";
  else importance = "unknown";

  return {
    importance,
    category: categoriseFromUpstream(input.category),
    market_impact: null,
  };
}

/**
 * Stable id for an event — content-hashed. Used so the cache + UI keys
 * stay consistent across fetches.
 */
export function eventId(country: string, datetime: string, event: string): string {
  const seed = `${country}|${datetime}|${event}`;
  // FNV-1a 32-bit — small, deterministic, sufficient for cache keys.
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `cal-${h.toString(16)}`;
}

// Filter for the briefing's display: "could this realistically move
// FX / rates / commodities / risk sentiment today?"
export function meetsDeskFilter(e: CalendarEvent): boolean {
  return e.importance === "critical" || e.importance === "high";
}
