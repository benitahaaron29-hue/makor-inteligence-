/**
 * Geopolitical / government event classifier.
 *
 * Pattern-based, deterministic. Two outputs:
 *
 *   kind       — one of the GeoKind enum values (see types.ts)
 *   relevance  — high / medium / low for the briefing filter
 *
 * Order in PATTERNS matters: the first matching rule wins, and we list
 * the highest-conviction categories first (sanctions, tariffs, war
 * escalation) before the more generic ones (speeches, press releases).
 *
 * The filter `meetsBriefingFilter` is the gate that decides which items
 * the LLM sees in the morning context. The rule mirrors the platform's
 * editorial position:
 *
 *   "Could this realistically move FX, rates, commodities, or global
 *    risk sentiment today?"
 *
 * If yes → kept. If no → dropped (but still counted in diagnostics so
 * operators can audit coverage).
 */

import type { GeoKind, GeoRelevance, GeoSourceSpec } from "./types";

interface Pattern {
  re: RegExp;
  kind: GeoKind;
  relevance: GeoRelevance;
}

// ----------------------------------------------------------------------
// Patterns. Highest-relevance / most-specific first.
// ----------------------------------------------------------------------
const PATTERNS: Pattern[] = [
  // Sanctions ----------------------------------------------------------
  { re: /\b(sanction(?:s|ed|ing)?|designat(?:e|es|ed|ion)|OFAC|asset freeze|export control|entity list)\b/i, kind: "sanctions", relevance: "high" },

  // Tariffs / trade actions -------------------------------------------
  { re: /\b(tariff(?:s)?|section ?(?:201|232|301)|duty|duties|countervail|chip (?:ban|restriction)|technology (?:ban|restriction)|semiconductor (?:ban|restriction)|export ban)\b/i, kind: "tariff", relevance: "high" },
  { re: /\b(trade (?:deal|agreement|pact|accord|talks|war|dispute|tensions?)|free trade|FTA|USMCA|trade restriction)\b/i, kind: "trade-deal", relevance: "high" },

  // Escalation / military / war ---------------------------------------
  { re: /\b(invasion|invade(?:s|d)?|missile|airstrike|air ?strike|drone strike|hostilities|escalation|escalat(?:e|ing)|attack(?:s|ed|ing)?|military operation|ceasefire|hostage|strait of taiwan|taiwan strait|gaza|hezbollah|hamas|iran (?:nuclear|strike|attack)|ukraine (?:offensive|front|advance))\b/i, kind: "escalation", relevance: "high" },

  // Commodity supply --------------------------------------------------
  { re: /\b(OPEC(?:\+|-)?(?: ?\+ ?)?|production (?:cut|quota|decision|target)|output (?:cut|quota)|oil (?:supply|embargo|disruption)|pipeline (?:closure|attack|disruption)|strait of hormuz|red sea (?:shipping|attack)|refinery (?:fire|outage))\b/i, kind: "commodity-supply", relevance: "high" },

  // Fiscal policy -----------------------------------------------------
  { re: /\b(budget (?:plan|proposal|announcement)|fiscal (?:plan|package|measure|policy|stimulus)|stimulus|spending plan|tax (?:cut|rise|hike|reform|policy)|debt ceiling|gilt issuance|bond issuance|treasury (?:issuance|refunding))\b/i, kind: "fiscal-policy", relevance: "high" },

  // Emergency ---------------------------------------------------------
  { re: /\b(emergency (?:meeting|summit|session)|crisis (?:talks|meeting|response)|urgent (?:meeting|action)|sovereign (?:default|stress))\b/i, kind: "emergency", relevance: "high" },

  // Summits / multilateral --------------------------------------------
  { re: /\b(G[-\s]?7|G[-\s]?20|NATO|EU council|european council|UN security council|summit|bilateral (?:meeting|talks))\b/i, kind: "summit", relevance: "high" },

  // Elections ---------------------------------------------------------
  { re: /\b(election results?|presidential election|general election|snap election|referendum|vote result)\b/i, kind: "election", relevance: "high" },
  { re: /\b(election|ballot|polls? open|polling station)\b/i, kind: "election", relevance: "medium" },

  // Global leaders by name — these almost always carry market-moving
  // weight, even when the title doesn't contain a specific kind keyword
  // ("Trump warns China on tariffs", "Xi meets Putin", "Lagarde says..."
  // etc). Bloomberg / Reuters / Investing.com lead with these and the
  // desk reads them as catalyst surface.
  { re: /\b(Trump|Xi(?: Jinping)?|Putin|Biden|Harris|Vance|Powell|Lagarde|Bailey|Ueda|Macron|Scholz|Sunak|Starmer|Modi|Netanyahu|Zelensky|Erdogan|Bessent|Yellen|Brainard)\b/i, kind: "leader-speech", relevance: "high" },

  // Country-pair flashpoints — a title mentioning these pairings is a
  // higher-than-default signal even before any "kind" pattern fires.
  { re: /\b(US[-\s]?China|China[-\s]?US|Taiwan[-\s]?(?:China|US)|Russia[-\s]?Ukraine|Iran[-\s]?(?:Israel|US)|Israel[-\s]?Iran|North Korea|DPRK)\b/i, kind: "escalation", relevance: "high" },

  // China-tech / export-control thread — a structural China-policy
  // axis the desk tracks continuously.
  { re: /\b(China.*(?:chip|semiconductor|technology|tech ban|export)|chip.*china|semiconductor.*china|tech.*china)\b/i, kind: "tariff", relevance: "high" },

  // Leader speeches / addresses — formal venue patterns
  { re: /\b(state of the union|inaugural address|fireside chat|address to (?:the )?nation|prime minister(?:'s)? statement|president(?:'s)? (?:speech|address|remarks))\b/i, kind: "leader-speech", relevance: "high" },
  { re: /\b(speech|remarks|address|statement) by (?:the )?(?:president|prime minister|chancellor|secretary|director-general|managing director|chair(?:man|woman)?)\b/i, kind: "leader-speech", relevance: "medium" },

  // Policy statements -------------------------------------------------
  { re: /\b(policy (?:statement|announcement)|joint statement|communique|communiqu[eé]|press conference)\b/i, kind: "policy-statement", relevance: "medium" },
];

export function classify(
  title: string,
  spec: GeoSourceSpec,
): { kind: GeoKind; relevance: GeoRelevance } {
  for (const p of PATTERNS) {
    if (p.re.test(title)) return { kind: p.kind, relevance: p.relevance };
  }
  // Default fallback. Tier-1 sources' press releases default to medium
  // (they almost always carry some market-relevant content); tier-2
  // sources default to low (filtered out unless explicitly upgraded by
  // a pattern above).
  return {
    kind: "press-release",
    relevance: spec.tier === 1 ? "medium" : "low",
  };
}

/**
 * Editorial filter: does this item belong in the morning briefing context?
 *
 * The aim is to keep the LLM context focused on items that "could
 * realistically move FX, rates, commodities, or global risk sentiment
 * today". Low-relevance items are filtered out; high is always kept;
 * medium is kept when the kind is structurally market-relevant.
 */
const ALWAYS_KEEP_KINDS = new Set<GeoKind>([
  "sanctions",
  "tariff",
  "trade-deal",
  "escalation",
  "commodity-supply",
  "fiscal-policy",
  "emergency",
  "summit",
]);

export function meetsBriefingFilter(item: {
  kind: GeoKind;
  relevance: GeoRelevance;
}): boolean {
  if (item.relevance === "high") return true;
  if (item.relevance === "low") return false;
  // medium: keep when the kind itself is structurally market-relevant.
  return ALWAYS_KEEP_KINDS.has(item.kind);
}

/** FNV-1a hash for stable ids. */
export function geoEventId(org: string, datetime: string, title: string): string {
  const seed = `${org}|${datetime}|${title.toLowerCase().replace(/\s+/g, " ").trim()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `geo-${h.toString(16)}`;
}
