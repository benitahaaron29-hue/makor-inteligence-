/**
 * Headline classifier — deterministic rule-based.
 *
 * Three outputs per headline:
 *
 *   category       — war-conflict / sanctions / tariffs-trade / elections /
 *                    government-speech / energy-opec / multilateral /
 *                    fiscal-policy / central-bank / other
 *   relevance      — high / medium / low / filtered
 *                    "filtered" drops the headline before the briefing
 *                    sees it (sports, entertainment, single-name
 *                    corporate gossip without macro angle).
 *   market_impact  — short desk-authored "why this matters for markets"
 *                    frame; one per category. Null for "other".
 *
 * Filter doctrine: "could this realistically move FX, rates,
 * commodities, or global risk sentiment today?" maps to relevance >=
 * medium. Everything below is dropped or hidden by default.
 *
 * Authored once, audited as regex — no LLM judgment in this layer.
 */

import type { Headline, HeadlineCategory, HeadlineRelevance } from "./types";

interface Pattern {
  re: RegExp;
  category: HeadlineCategory;
  relevance: HeadlineRelevance;
}

// ---------------------------------------------------------------------------
// FILTER patterns — drop these from the briefing entirely.
// Sports, entertainment, weather, celebrity, narrowly-local stories that
// have no plausible cross-asset read.
// ---------------------------------------------------------------------------

const FILTER_PATTERNS: RegExp[] = [
  /\b(NFL|NBA|MLB|NHL|premier league|champions league|world cup|olympic)\b/i,
  /\b(super bowl|wimbledon|grand slam|formula 1|f1 race)\b/i,
  /\b(oscar|grammy|emmy|tony award|red carpet|hollywood)\b/i,
  /\b(box office|movie premiere|tv series|new album|concert tour)\b/i,
  /\b(celebrity|royal wedding|gossip|reality show)\b/i,
  /\b(recipe|food review|restaurant opens)\b/i,
  /\b(weather forecast|severe storm|tornado watch)\b/i,
  /\b(crossword|sudoku|horoscope)\b/i,
];

// ---------------------------------------------------------------------------
// HIGH-relevance patterns — actively market-moving categories.
// ---------------------------------------------------------------------------

const HIGH_PATTERNS: Pattern[] = [
  // War / armed conflict
  { re: /\b(missile|airstrike|drone\s+(?:attack|strike)|airstrikes?)\b/i, category: "war-conflict", relevance: "high" },
  { re: /\b(invasion|invades?|invaded)\b/i, category: "war-conflict", relevance: "high" },
  { re: /\b(ceasefire|truce|armistice)\b/i, category: "war-conflict", relevance: "high" },
  { re: /\b(war\s+between|hostilities|combat\s+operations)\b/i, category: "war-conflict", relevance: "high" },
  { re: /\b(troops\s+(?:enter|cross|deploy)|military\s+strike)\b/i, category: "war-conflict", relevance: "high" },
  { re: /\b(strait\s+of\s+hormuz|red\s+sea|black\s+sea)\b.*\b(closed|blocked|attack|incident)\b/i, category: "war-conflict", relevance: "high" },

  // Sanctions
  { re: /\bsanctions?\b.{0,40}\b(impose|target|lift|ease|expand|new)\b/i, category: "sanctions", relevance: "high" },
  { re: /\b(impose|imposed|expand)\b.{0,30}\bsanctions?\b/i, category: "sanctions", relevance: "high" },
  { re: /\b(asset\s+freeze|asset\s+seizure|embargo|export\s+controls?)\b/i, category: "sanctions", relevance: "high" },
  { re: /\b(secondary\s+sanctions|swift\s+access|swift\s+ban)\b/i, category: "sanctions", relevance: "high" },

  // Tariffs / trade
  { re: /\btariffs?\b/i, category: "tariffs-trade", relevance: "high" },
  { re: /\b(trade\s+war|trade\s+deal|trade\s+pact|trade\s+agreement)\b/i, category: "tariffs-trade", relevance: "high" },
  { re: /\b(import\s+duties|export\s+controls|trade\s+restrictions?)\b/i, category: "tariffs-trade", relevance: "high" },
  { re: /\b(USMCA|EU.{0,20}trade|china.{0,20}trade|US.{0,20}china\s+trade)\b/i, category: "tariffs-trade", relevance: "high" },

  // OPEC / energy
  { re: /\b(OPEC\+?|OPEC\s+plus)\b/i, category: "energy-opec", relevance: "high" },
  { re: /\b(crude\s+oil|brent\s+crude|wti\s+crude)\b.{0,40}\b(jumps?|surges?|falls?|drops?|climbs?|tumbles?|plunges?)\b/i, category: "energy-opec", relevance: "high" },
  { re: /\b(oil\s+output|oil\s+supply|production\s+cut|output\s+cut)\b/i, category: "energy-opec", relevance: "high" },
  { re: /\b(natural\s+gas|LNG)\b.{0,40}\b(supply|halt|cut|surge|price)\b/i, category: "energy-opec", relevance: "high" },

  // Multilateral institutions
  { re: /\b(G[\s-]?7|G[\s-]?20)\b.{0,40}\b(summit|meeting|communiqu[ée]|leaders|statement)\b/i, category: "multilateral", relevance: "high" },
  { re: /\bNATO\b.{0,40}\b(summit|meeting|statement|response|deploy)\b/i, category: "multilateral", relevance: "high" },
  { re: /\b(IMF|World\s+Bank)\b.{0,40}\b(meeting|outlook|warns?|forecast)\b/i, category: "multilateral", relevance: "high" },

  // Head-of-government / finance-ministerial speech
  { re: /\b(?:prime\s+minister|chancellor|president|finance\s+minister|treasury\s+secretary)\b.{0,40}\b(?:said|says|announced|warns?|warned|told|signals?|signalled)\b/i, category: "government-speech", relevance: "high" },
  { re: /\b(white\s+house|kremlin|downing\s+street|elys[ée]e)\b.{0,40}\b(statement|said|announced)\b/i, category: "government-speech", relevance: "high" },

  // Elections — major economy
  { re: /\b(election\s+results?|vote\s+count|polls?\s+close)\b/i, category: "elections", relevance: "high" },
  { re: /\b(wins?|won|defeats?|defeated|concedes?|conceded)\b.{0,30}\b(election|race|vote|run-?off|presidency)\b/i, category: "elections", relevance: "high" },

  // Central bank — chair / president speakers + decisions
  { re: /\b(Powell|Lagarde|Bailey|Ueda)\b.{0,40}\b(said|says|signals?|signalled|warns?|hints?|speaks?|told)\b/i, category: "central-bank", relevance: "high" },
  { re: /\b(Fed|FOMC|ECB|BoE|BoJ|SNB)\b.{0,40}\b(rate\s+(?:decision|hike|cut)|policy\s+(?:meeting|decision|statement))\b/i, category: "central-bank", relevance: "high" },
];

// ---------------------------------------------------------------------------
// MEDIUM-relevance patterns — macro-relevant but not always tradeable today.
// ---------------------------------------------------------------------------

const MEDIUM_PATTERNS: Pattern[] = [
  // Fiscal policy
  { re: /\b(budget|fiscal\s+plan|deficit|debt\s+ceiling|borrowing\s+plan)\b/i, category: "fiscal-policy", relevance: "medium" },
  { re: /\b(treasury\s+issuance|sovereign\s+(?:bond|debt))\b/i, category: "fiscal-policy", relevance: "medium" },
  { re: /\b(tax\s+(?:cut|hike|reform|policy))\b/i, category: "fiscal-policy", relevance: "medium" },

  // Lower-profile CB speakers (governors / committee members)
  { re: /\b(Fed\s+(?:governor|president)|ECB\s+(?:governor|board\s+member)|MPC\s+member)\b/i, category: "central-bank", relevance: "medium" },
  { re: /\b(BIS|Federal\s+Reserve\s+Bank\s+of)\b/i, category: "central-bank", relevance: "medium" },

  // Trade-policy-adjacent without specific tariffs (negotiations, talks)
  { re: /\b(trade\s+(?:talks|negotiations|tensions))\b/i, category: "tariffs-trade", relevance: "medium" },

  // Energy-adjacent
  { re: /\b(strategic\s+(?:petroleum\s+)?reserve|inventory\s+draw|inventory\s+build)\b/i, category: "energy-opec", relevance: "medium" },
  { re: /\b(refinery\s+(?:shutdown|outage|fire))\b/i, category: "energy-opec", relevance: "medium" },

  // Elections — minor economies, primaries, polling
  { re: /\b(primary|caucus|opinion\s+poll|polling\s+(?:shows?|lead))\b/i, category: "elections", relevance: "medium" },
];

// ---------------------------------------------------------------------------
// Market-impact frames — one per category. Desk-authored, neutral.
// ---------------------------------------------------------------------------

const MARKET_IMPACT: Record<HeadlineCategory, string | null> = {
  "war-conflict":
    "Geopolitical premium feeds safe-haven flows — gold and JPY/CHF bid, front-end rates rally on flight-to-quality. Commodity bloc reacts via energy and grain supply exposure.",
  "sanctions":
    "Targeted-currency depreciation; commodity-flow disruption affects the front of the relevant curve. Reserve-currency narrative for the imposing bloc.",
  "tariffs-trade":
    "Hits targeted-country FX (typically weaker) and equity sector flows; supply-chain inflation feeds back to central-bank reaction functions.",
  "elections":
    "Political-risk premium for the country's bonds and currency. Major-economy elections widen cross-asset volatility for weeks around the vote.",
  "government-speech":
    "Watch fiscal-rule language, tariff signalling, and FX-policy framing. Direct read on currency credibility and policy continuity.",
  "energy-opec":
    "Production decisions set the front-month Brent curve. Commodity-bloc FX (CAD, NOK, MXN) reacts via curve shape; equity energy sector tracks spot.",
  "multilateral":
    "Coordination signal on tariffs, sanctions, and defence spending. Communiqué language affects USD reserve sentiment and cross-border capital flows.",
  "fiscal-policy":
    "Affects sovereign-credit premium and currency credibility. Watch debt-issuance plans, tax language, and deficit-financing strategy.",
  "central-bank":
    "Direct policy signal — entire curve plus currency reacts. Forward-guidance language matters more than the headline framing.",
  "other": null,
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ClassificationResult {
  category: HeadlineCategory;
  relevance: HeadlineRelevance;
  market_impact: string | null;
}

export function classifyHeadline(title: string): ClassificationResult {
  if (!title || title.trim().length === 0) {
    return { category: "other", relevance: "filtered", market_impact: null };
  }

  // 1. Filter out clearly non-macro categories first.
  for (const re of FILTER_PATTERNS) {
    if (re.test(title)) {
      return { category: "other", relevance: "filtered", market_impact: null };
    }
  }

  // 2. High-relevance categories.
  for (const p of HIGH_PATTERNS) {
    if (p.re.test(title)) {
      return {
        category: p.category,
        relevance: p.relevance,
        market_impact: MARKET_IMPACT[p.category],
      };
    }
  }

  // 3. Medium-relevance categories.
  for (const p of MEDIUM_PATTERNS) {
    if (p.re.test(title)) {
      return {
        category: p.category,
        relevance: p.relevance,
        market_impact: MARKET_IMPACT[p.category],
      };
    }
  }

  // 4. Default — macro-adjacent but not pattern-matched. Surface at low.
  return { category: "other", relevance: "low", market_impact: null };
}

/** FNV-1a 32-bit hash — small, deterministic, sufficient for cache + dedupe. */
export function headlineId(source: string, title: string): string {
  const seed = `${source.toLowerCase()}|${title.toLowerCase().replace(/\s+/g, " ").trim()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `hl-${h.toString(16)}`;
}

/** Filter the briefing renders by default: only high + medium are shown. */
export function meetsBriefingFilter(h: Headline): boolean {
  return h.relevance === "high" || h.relevance === "medium";
}
