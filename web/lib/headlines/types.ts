/**
 * Headline canonical shape.
 *
 * The briefing displays only:
 *   - the headline (link anchor text — factual, short)
 *   - source attribution + link to the original article
 *   - our own market-impact frame (desk-authored, original)
 *   - classification + timestamp
 *
 * We deliberately do NOT store or render the RSS `description` body —
 * the value-add is the WHY framing on top of the link, not the
 * reproduction of someone else's prose.
 *
 * The relevance filter answers: "Could this realistically move FX,
 * rates, commodities, or global risk sentiment today?"
 *     high     — yes, watch this
 *     medium   — adjacent or developing
 *     low      — macro-relevant but unlikely to move markets today
 *     filtered — non-macro noise; dropped before the briefing sees it
 */

export type HeadlineCategory =
  | "war-conflict"
  | "sanctions"
  | "tariffs-trade"
  | "elections"
  | "government-speech"
  | "energy-opec"
  | "multilateral"      // G7 / G20 / NATO / IMF / World Bank
  | "fiscal-policy"
  | "central-bank"
  | "other";

export type HeadlineRelevance = "high" | "medium" | "low" | "filtered";

export interface Headline {
  /** Stable id: FNV-1a hash of (source + normalised title). Used for dedupe. */
  id: string;
  /** Factual short headline — the link anchor text from RSS <title>. */
  title: string;
  category: HeadlineCategory;
  relevance: HeadlineRelevance;
  /** Why this matters for markets — desk-authored frame. Null when no
   *  template applies for this category. */
  market_impact: string | null;
  /** ISO 8601. Parsed from the RSS pubDate / Atom updated field. */
  published_at: string;
  /** "Reuters" / "BBC" / "AP" / etc. — what the renderer shows. */
  source: string;
  /** Link to the original article. The reader follows for full content. */
  source_url: string;
  fetched_at: string;
}
