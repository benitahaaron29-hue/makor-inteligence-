/**
 * Market-impact scoring — institutional priority engine.
 *
 * Classifies any event (calendar release / geopolitical item / CB
 * activity / headline) into one of four institutional tiers:
 *
 *   extreme — must appear in the briefing, regardless of source feed
 *             coverage gaps. Examples: US CPI, NFP, FOMC decision,
 *             Trump / China tariff escalation, Taiwan / Iran / Israel
 *             escalation, OPEC supply disruption, sovereign crisis,
 *             major sanctions, emergency CB action.
 *
 *   high    — should be a leading item when present. Examples:
 *             Powell / Lagarde / Bailey / Ueda speeches, Treasury
 *             auctions, fiscal announcements, G7 / G20 meetings,
 *             trade negotiations, export-control developments,
 *             major diplomatic meetings.
 *
 *   medium  — institutional but not headline; surfaces when slot
 *             available. Routine CB speeches, secondary releases,
 *             tier-2 supranational items.
 *
 *   low     — generic / routine; can be dropped from the LLM context
 *             entirely to keep token budget focused on what matters.
 *
 * The scorer is deterministic and pattern-based. Adding a new pattern
 * is one line — service code does not change.
 *
 * Used by:
 *   - lib/geopol/service.ts (promote tier=extreme/high to relevance=high
 *     so they always survive meetsBriefingFilter)
 *   - lib/calendar/service.ts (promote tier=extreme to importance=critical
 *     so they survive meetsDeskFilter)
 *   - components/briefing/briefing-reader.tsx#buildCatalysts (rank +
 *     promote sensitivity)
 *   - lib/narrative/context.ts (surface tier in the LLM context line)
 *   - lib/narrative/prompt.ts (rule that requires extreme/high to lead)
 */

import type { CalendarEvent } from "@/lib/calendar/types";
import type { CBEvent } from "@/lib/central-banks/types";
import type { GeoEvent } from "@/lib/geopol/types";
import type { Headline } from "@/lib/headlines/types";

export type ImpactTier = "extreme" | "high" | "medium" | "low";

const TIER_RANK: Record<ImpactTier, number> = {
  extreme: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function tierRank(t: ImpactTier): number {
  return TIER_RANK[t];
}

/** Max of two tiers — used when a single item matches multiple patterns. */
export function maxTier(a: ImpactTier, b: ImpactTier): ImpactTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

// ---------------------------------------------------------------------------
// Calendar releases
// ---------------------------------------------------------------------------
//
// Institutional macro release taxonomy. The full title from
// TradingEconomics often looks like "United States · CPI YoY" or
// "FOMC Statement". We match against the event text plus the country.

const CAL_EXTREME = [
  // US data flashpoints
  /\b(US|United States).*\bCPI\b/i,
  /\bCPI.*\b(US|United States)\b/i,
  /\b(US|United States).*\b(Retail Sales|Nonfarm Payrolls|NFP|Non-?Farm)\b/i,
  /\b(Retail Sales|Nonfarm Payrolls|NFP|Non-?Farm).*\b(US|United States)\b/i,
  /\b(US|United States).*\b(GDP|Core PCE|PCE Price)\b/i,
  /\bUnemployment Rate\b.*\b(US|United States)\b/i,
  /\bISM\b.*\b(Manufacturing|Services|Non[-\s]?Manufacturing)\b/i,
  /\b(US|United States).*\bISM\b/i,
  // Major CB decisions
  /\bFOMC (Statement|Meeting|Decision|Rate Decision)\b/i,
  /\bFederal Reserve.*\b(Rate Decision|Meeting)\b/i,
  /\bECB.*\b(Rate Decision|Main Refinancing|Monetary Policy)\b/i,
  /\b(BoJ|Bank of Japan).*\b(Rate Decision|Policy Statement)\b/i,
  /\b(BoE|Bank of England).*\b(Rate Decision|Bank Rate)\b/i,
  /\b(SNB|Swiss National Bank).*\b(Rate Decision|Policy Assessment)\b/i,
  /\bRate Decision\b/i,
  // Big EZ flashpoints
  /\b(Eurozone|Euro Area|Germany).*\b(CPI|HICP|GDP|Unemployment Rate|PMI Manufacturing)\b/i,
  /\b(China|CN).*\b(CPI|GDP|Retail Sales|Industrial Production|PMI)\b/i,
];

const CAL_HIGH = [
  // PMIs & sentiment surveys
  /\bPMI\b/i,
  /\bManufacturing PMI\b/i,
  /\bServices PMI\b/i,
  /\bComposite PMI\b/i,
  /\bIfo\b/i,
  /\bZEW\b/i,
  /\bSentiment\b/i,
  // Inflation prints (non-headline geographies)
  /\b(CPI|HICP|PPI|RPI)\b/i,
  // Labour
  /\b(Jobless|Initial Claims|Continuing Claims|Employment Change)\b/i,
  /\bAverage (Hourly )?Earnings\b/i,
  // Growth
  /\b(GDP|Industrial Production|Retail Sales|Trade Balance)\b/i,
  // Auctions & issuance
  /\b(Auction|Treasury (Bill|Note|Bond)|Gilt|Bund|JGB)\b/i,
  // CB speakers + minutes
  /\b(FOMC Minutes|ECB Account|MPC Minutes|Powell|Lagarde|Bailey|Ueda|Schnabel|Lane|Mester|Williams|Waller|Brainard|Bessent|Yellen)\b/i,
  // Confidence / consumer
  /\b(Consumer Confidence|Consumer Sentiment|Michigan Sentiment|UMich)\b/i,
];

export function scoreCalendarEvent(e: CalendarEvent): ImpactTier {
  return scoreCalendarText(e.country, e.event, e.importance);
}

/**
 * Text-only calendar scorer — used by buildCatalysts in the reader,
 * where the KeyEvent shape has country (as e.region) and event but not
 * the full CalendarEvent payload. Same regex rules as scoreCalendarEvent.
 */
export function scoreCalendarText(
  country: string,
  event: string,
  importance: string | null | undefined,
): ImpactTier {
  const hay = `${country} ${event}`;
  if (CAL_EXTREME.some((r) => r.test(hay))) return "extreme";
  if (CAL_HIGH.some((r) => r.test(hay))) return "high";
  const imp = (importance ?? "").toLowerCase();
  if (imp === "critical") return "extreme";
  if (imp === "high") return "high";
  if (imp === "medium") return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Geopolitical events
// ---------------------------------------------------------------------------

const GEO_EXTREME = [
  // US-China axis — the dominant overnight macro thread
  /\bUS[-\s]?China\b|\bChina[-\s]?US\b/i,
  /\bTrump.*\bChina\b/i,
  /\bChina.*\bTrump\b/i,
  /\bXi.*\b(Trump|US|United States|tariff|chip|semiconductor|technology)\b/i,
  /\b(tariff|tariffs)\b.*\b(China|US|United States|escalat|impose|expand)/i,
  // Taiwan / strait / chip wars
  /\bTaiwan\b.*\b(China|US|strait|chip|semiconductor|drill|exercise)\b/i,
  /\b(strait of taiwan|taiwan strait)\b/i,
  // Iran-Israel-Middle East escalation
  /\b(Iran|Israel).*\b(strike|missile|attack|nuclear|escalat)\b/i,
  /\b(Iran[-\s]?Israel|Israel[-\s]?Iran)\b/i,
  /\b(Gaza|Hamas|Hezbollah).*\b(strike|invasion|escalat|hostilities)\b/i,
  // Russia-Ukraine escalation
  /\b(Russia|Ukraine).*\b(offensive|escalat|strike|nuclear|annex)\b/i,
  // Sanctions / export controls / chip bans
  /\b(sanction|sanctions|sanctioned).*\b(China|Russia|Iran|Hezbollah|major)\b/i,
  /\bexport control\b.*\b(chip|semiconductor|technology|advanced)\b/i,
  /\bchip\b.*\b(ban|restriction|export control)\b/i,
  /\bsemiconductor\b.*\b(ban|restriction|export control)\b/i,
  // OPEC supply shocks
  /\bOPEC\+?\b.*\b(cut|surprise|emergency|disruption|production)\b/i,
  /\boil\b.*\b(supply|embargo|shock|disruption)\b/i,
  /\bstrait of hormuz\b/i,
  // Sovereign / emergency
  /\b(emergency|crisis|urgent)\b.*\b(meeting|summit|session|action|response)\b/i,
  /\bsovereign\b.*\b(default|crisis|stress|downgrade)\b/i,
];

const GEO_HIGH = [
  // Trade-policy thread
  /\b(tariff|trade war|trade dispute|trade talks)\b/i,
  /\b(USMCA|Section\s?301|Section\s?232)\b/i,
  // Sanctions — anywhere
  /\b(sanction|OFAC|asset freeze|designation|entity list)\b/i,
  // Named leaders
  /\b(Trump|Xi|Putin|Biden|Powell|Lagarde|Bailey|Ueda|Macron|Scholz|Sunak|Starmer|Modi|Netanyahu|Zelensky|Erdogan|Bessent|Yellen)\b/i,
  // Multilateral
  /\b(G[-\s]?7|G[-\s]?20|NATO|UN Security Council|IMF|World Bank)\b.*\b(meeting|summit|statement|action)\b/i,
  // Fiscal flashpoints
  /\b(debt ceiling|budget|fiscal package|stimulus|spending plan|tax (cut|rise|reform))\b/i,
];

export function scoreGeoEvent(e: GeoEvent): ImpactTier {
  const hay = e.title;
  if (GEO_EXTREME.some((r) => r.test(hay))) return "extreme";
  if (GEO_HIGH.some((r) => r.test(hay))) return "high";
  if (e.kind === "sanctions" || e.kind === "tariff" || e.kind === "escalation" || e.kind === "commodity-supply") return "high";
  if (e.relevance === "high") return "high";
  if (e.relevance === "medium") return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// CB events
// ---------------------------------------------------------------------------

const CB_EXTREME_TITLE = [
  /\bFOMC (Statement|Decision|Rate Decision|Meeting)\b/i,
  /\b(ECB|European Central Bank).*\b(Monetary Policy Decision|Rate Decision)\b/i,
  /\b(BoE|MPC).*\b(Bank Rate|Rate Decision|Monetary Policy)\b/i,
  /\b(BoJ).*\b(Rate Decision|Statement on Monetary Policy)\b/i,
  /\b(SNB).*\b(Monetary Policy Assessment|Rate Decision)\b/i,
  /\bemergency\b/i,
];

export function scoreCBEvent(e: CBEvent): ImpactTier {
  if (CB_EXTREME_TITLE.some((r) => r.test(e.title))) return "extreme";
  if (e.kind === "statement" || e.kind === "press-conf") return "high";
  if (e.kind === "minutes" || e.kind === "testimony") return "high";
  if (e.kind === "speech") return "medium";
  return "low";
}

// ---------------------------------------------------------------------------
// Headlines
// ---------------------------------------------------------------------------

const HL_EXTREME = [
  // Re-uses geo extreme patterns — the BBC/AP headline feed surfaces
  // many of the same flashpoints as the government feeds.
  ...GEO_EXTREME,
];

export function scoreHeadline(h: Headline): ImpactTier {
  if (HL_EXTREME.some((r) => r.test(h.title))) return "extreme";
  if (
    h.category === "war-conflict" ||
    h.category === "sanctions" ||
    h.category === "tariffs-trade" ||
    h.category === "energy-opec"
  ) {
    return h.relevance === "high" ? "high" : "medium";
  }
  if (h.relevance === "high") return "high";
  if (h.relevance === "medium") return "medium";
  return "low";
}

/** Short display label for the LLM context + UI badges. */
export function tierLabel(t: ImpactTier): string {
  return t.toUpperCase();
}
