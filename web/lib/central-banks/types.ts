/**
 * Central-bank canonical shapes.
 *
 * Every CB event in the briefing carries:
 *   - the bank (Fed / ECB / BoE / BoJ / SNB)
 *   - the kind (statement, minutes, speech, press-conf, testimony)
 *   - the speaker name when one can be extracted from the title
 *   - the time it was published upstream
 *   - source attribution + link to the original
 *   - a desk-authored "why this CB matters today" frame
 *
 * The architecture mirrors the headlines layer (Phase 2.2): the briefing
 * displays only the link anchor + our editorial framing, never the
 * upstream article body.
 */

export type CBName = "Fed" | "ECB" | "BoE" | "BoJ" | "SNB";

export type CBEventKind =
  | "statement"    // FOMC statement, ECB monetary-policy decisions, MPC summary
  | "minutes"      // FOMC minutes, ECB account of the meeting, MPC minutes
  | "speech"       // governor / president / committee member on the wire
  | "press-conf"   // post-meeting press conference
  | "testimony"    // congressional / parliamentary testimony
  | "release";     // routine press release / data publication (other)

export interface CBEvent {
  /** Stable id: FNV-1a hash of (bank + datetime + title). */
  id: string;
  bank: CBName;
  kind: CBEventKind;
  /** ISO 8601 of upstream publication. */
  datetime: string;
  /** Reserved for a future calendar-adapter integration; always false here. */
  is_future: boolean;
  /** Speaker name when the title makes it extractable, else null. */
  speaker: string | null;
  title: string;
  source: string;          // "Federal Reserve" / "European Central Bank" / ...
  source_url: string;
  /** Desk-authored "why this CB matters today" frame. */
  market_impact: string | null;
  fetched_at: string;
}

/**
 * Per-bank metadata. Public-feed URLs, official calendar URL, and the
 * desk's market-impact frame live here. Adding a new bank is one entry
 * in feeds.ts; service + renderer code does not change.
 */
export interface CBSpec {
  bank: CBName;
  name: string;            // "Federal Reserve" — full name shown in the UI
  feeds: Array<{ url: string; default_kind: CBEventKind }>;
  /** Public URL where the official meeting calendar is published. */
  calendar_url: string;
  /** Short desk-authored frame: why this CB matters today. */
  market_impact: string;
  /** Neutral bias label used by the existing CentralBankItem renderer. */
  bias: string;
}
