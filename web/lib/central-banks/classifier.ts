/**
 * Central-bank event classifier.
 *
 * Two outputs per item:
 *
 *   kind     — statement / minutes / speech / press-conf / testimony / release
 *   speaker  — name extracted from the title when one is present; null
 *              otherwise (we never invent a speaker)
 *
 * The classifier is pattern-based and deterministic. Patterns are tuned
 * for the title conventions each bank uses on its own RSS feeds:
 *   Fed     — "FOMC statement", "Minutes of the FOMC", "Speech by ..."
 *   ECB     — "Monetary policy decisions", "Account of the meeting",
 *             "Speech by ...", "Interview with ..."
 *   BoE     — "Monetary Policy Summary", "Minutes of the MPC", "Speech ..."
 *   BoJ     — "Statement on Monetary Policy", "Minutes of MPM", "Speech ..."
 *   SNB     — "Monetary policy assessment", "Speech ..."
 */

import type { CBEventKind } from "./types";

interface Pattern {
  re: RegExp;
  kind: CBEventKind;
}

const PATTERNS: Pattern[] = [
  // Minutes
  { re: /\bminutes\b/i, kind: "minutes" },
  { re: /\baccount of the\b/i, kind: "minutes" },
  { re: /\bsummary of opinions\b/i, kind: "minutes" },

  // Press conference
  { re: /\bpress conference\b/i, kind: "press-conf" },

  // Testimony
  { re: /\btestimony\b/i, kind: "testimony" },
  { re: /\bbefore (?:congress|senate|house|parliament|committee)\b/i, kind: "testimony" },
  { re: /\bsemiannual monetary policy report\b/i, kind: "testimony" },

  // Statement / monetary-policy decision
  { re: /\bFOMC statement\b/i, kind: "statement" },
  { re: /\bmonetary policy (?:summary|decisions?|assessment|statement)\b/i, kind: "statement" },
  { re: /\bstatement on monetary policy\b/i, kind: "statement" },
  { re: /\binterest rate decision\b/i, kind: "statement" },

  // Speech / interview
  { re: /\bspeech\b/i, kind: "speech" },
  { re: /\binterview\b/i, kind: "speech" },
  { re: /\bremarks\b/i, kind: "speech" },
  { re: /\bspeaks\b/i, kind: "speech" },
];

export function classifyKind(title: string): CBEventKind {
  for (const p of PATTERNS) {
    if (p.re.test(title)) return p.kind;
  }
  return "release";
}

/**
 * Extract a speaker name from a title when the title follows one of the
 * standard CB-feed patterns. Returns null when no pattern matches —
 * we never fabricate a name.
 *
 * Examples handled:
 *   "Speech by Governor Smith on monetary policy"  → "Governor Smith"
 *   "Remarks by Chair Powell at the ..."           → "Chair Powell"
 *   "Interview with Christine Lagarde, ..."        → "Christine Lagarde"
 *   "Smith: financial stability outlook"           → "Smith"
 */
export function extractSpeaker(title: string): string | null {
  if (!title) return null;

  // "Speech by X" / "Remarks by X" / "Address by X"
  const byMatch = title.match(/\b(?:speech|remarks|address|presentation|testimony)\s+by\s+([^,\-—–:|(]{2,80})/i);
  if (byMatch) return cleanName(byMatch[1]);

  // "Interview with X"
  const withMatch = title.match(/\binterview\s+with\s+([^,\-—–:|(]{2,80})/i);
  if (withMatch) return cleanName(withMatch[1]);

  // "X: topic" or "X — topic" — surname-first pattern Fed often uses
  const colonMatch = title.match(/^([A-Z][A-Za-z'\-]+(?:\s+[A-Z][A-Za-z'\-]+){0,3}):\s/);
  if (colonMatch) return cleanName(colonMatch[1]);

  return null;
}

function cleanName(raw: string): string | null {
  // Strip trailing topic phrasing ("on monetary policy", "at the ...").
  let s = raw
    .replace(/\s+(?:on|at|to|before|in|for|during)\s+.*$/i, "")
    .replace(/[,;:.()]/g, "")
    .trim();
  // Reject obvious non-names (single word, all-caps acronyms).
  if (s.length < 3 || s.length > 80) return null;
  if (/^[A-Z]{2,}$/.test(s)) return null;
  return s;
}

/** FNV-1a hash for stable ids. */
export function cbEventId(bank: string, datetime: string, title: string): string {
  const seed = `${bank}|${datetime}|${title.toLowerCase().replace(/\s+/g, " ").trim()}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return `cb-${h.toString(16)}`;
}
