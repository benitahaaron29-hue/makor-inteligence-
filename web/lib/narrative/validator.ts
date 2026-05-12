/**
 * Validate the LLM's JSON output.
 *
 * Rejects on any of:
 *   - The text isn't valid JSON
 *   - Required fields are missing or wrong type
 *   - risk_tone isn't one of the four enum values
 *   - citations[] references an id that doesn't exist in the context
 *   - Length budgets are massively exceeded (defensive cap at 2x the
 *     stated maximum — past that the model is clearly hallucinating
 *     detail)
 *
 * Returns the typed NarrativeOutput on success, or throws with a
 * descriptive reason on failure. The service layer catches and falls
 * back to the existing template content.
 */

import type { NarrativeOutput, NarrativeCitation, RiskToneOutput } from "./types";
import type { ContextDoc } from "./context";

const VALID_TONES: ReadonlyArray<RiskToneOutput> = ["risk_on", "risk_off", "mixed", "neutral"];
const VALID_KINDS: ReadonlyArray<NarrativeCitation["kind"]> = ["q", "cal", "hl", "cb"];

// Defensive 2x maximum caps. Any field longer than this is rejected as
// likely hallucination — institutional briefs are concise by design.
const FIELD_MAX_HARD: Record<string, number> = {
  executive_summary: 900,
  "strategist_view.headline": 160,
  "strategist_view.body": 700,
  "macro_overview.opening": 600,
  "macro_overview.whats_moving": 600,
  "macro_overview.rates_view": 600,
  "macro_overview.cross_asset_thesis": 600,
  "what_changed.summary": 440,
  fx_commentary: 480,
  rates_commentary: 480,
  equities_commentary: 480,
  commodities_commentary: 480,
};

function fail(reason: string): never {
  throw new Error(`narrative validation: ${reason}`);
}

function ensureString(v: unknown, path: string): string {
  if (typeof v !== "string") fail(`${path} is not a string`);
  if (v.length > (FIELD_MAX_HARD[path] ?? Infinity)) fail(`${path} exceeds max length`);
  return v;
}

function ensureStringArray(v: unknown, path: string, maxItems: number): string[] {
  if (!Array.isArray(v)) fail(`${path} is not an array`);
  if (v.length > maxItems) fail(`${path} has too many items (${v.length} > ${maxItems})`);
  return v.map((x, i) => {
    if (typeof x !== "string") fail(`${path}[${i}] is not a string`);
    if (x.length > 200) fail(`${path}[${i}] exceeds max length`);
    return x;
  });
}

/**
 * Strip a leading/trailing markdown code fence the LLM might emit despite
 * being told not to. Common patterns: ```json ... ``` or just ``` ... ```.
 */
function stripFence(s: string): string {
  const trimmed = s.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export function validateNarrative(
  rawText: string,
  ctx: ContextDoc,
): NarrativeOutput {
  // 1. Parse JSON.
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFence(rawText));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fail(`JSON parse: ${msg}`);
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    fail("root is not an object");
  }
  const o = parsed as Record<string, unknown>;

  // 2. Top-level fields.
  const executive_summary = ensureString(o.executive_summary, "executive_summary");

  const sv = o.strategist_view;
  if (typeof sv !== "object" || sv === null || Array.isArray(sv)) fail("strategist_view shape");
  const strategist_view = {
    headline: ensureString((sv as Record<string, unknown>).headline, "strategist_view.headline"),
    body: ensureString((sv as Record<string, unknown>).body, "strategist_view.body"),
  };

  const mo = o.macro_overview;
  if (typeof mo !== "object" || mo === null || Array.isArray(mo)) fail("macro_overview shape");
  const macro_overview = {
    opening: ensureString((mo as Record<string, unknown>).opening, "macro_overview.opening"),
    whats_moving: ensureString((mo as Record<string, unknown>).whats_moving, "macro_overview.whats_moving"),
    rates_view: ensureString((mo as Record<string, unknown>).rates_view, "macro_overview.rates_view"),
    cross_asset_thesis: ensureString((mo as Record<string, unknown>).cross_asset_thesis, "macro_overview.cross_asset_thesis"),
  };

  const wc = o.what_changed;
  if (typeof wc !== "object" || wc === null || Array.isArray(wc)) fail("what_changed shape");
  const what_changed = {
    summary: ensureString((wc as Record<string, unknown>).summary, "what_changed.summary"),
    deltas: ensureStringArray((wc as Record<string, unknown>).deltas, "what_changed.deltas", 8),
  };

  // 3. key_takeaways.
  const ktRaw = o.key_takeaways;
  if (!Array.isArray(ktRaw)) fail("key_takeaways is not an array");
  if (ktRaw.length < 1 || ktRaw.length > 7) fail(`key_takeaways length ${ktRaw.length} outside 1..7`);
  const key_takeaways = ktRaw.map((item, i) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) fail(`key_takeaways[${i}] shape`);
    const rec = item as Record<string, unknown>;
    const rank = typeof rec.rank === "number" ? rec.rank : i + 1;
    const text = ensureString(rec.text, `key_takeaways[${i}].text`);
    if (text.length > 200) fail(`key_takeaways[${i}].text exceeds max length`);
    return { rank, text };
  });

  // 4. Asset-class commentaries.
  const fx_commentary = ensureString(o.fx_commentary, "fx_commentary");
  const rates_commentary = ensureString(o.rates_commentary, "rates_commentary");
  const equities_commentary = ensureString(o.equities_commentary, "equities_commentary");
  const commodities_commentary = ensureString(o.commodities_commentary, "commodities_commentary");

  // 5. risk_tone.
  const tone = o.risk_tone;
  if (typeof tone !== "string" || !VALID_TONES.includes(tone as RiskToneOutput)) {
    fail(`risk_tone invalid (${String(tone)})`);
  }
  const risk_tone = tone as RiskToneOutput;

  // 6. citations[] — verify every (kind, id) references a real context entry.
  const citationsRaw = o.citations;
  if (!Array.isArray(citationsRaw)) fail("citations is not an array");
  const citations: NarrativeCitation[] = citationsRaw.map((c, i) => {
    if (typeof c !== "object" || c === null || Array.isArray(c)) fail(`citations[${i}] shape`);
    const rec = c as Record<string, unknown>;
    const kind = rec.kind;
    if (typeof kind !== "string" || !VALID_KINDS.includes(kind as NarrativeCitation["kind"])) {
      fail(`citations[${i}].kind invalid`);
    }
    const id = rec.id;
    if (typeof id !== "number" || !Number.isFinite(id)) fail(`citations[${i}].id invalid`);
    const pool = ctx.valid_ids[kind as NarrativeCitation["kind"]];
    if (!pool.includes(id)) fail(`citations[${i}] references missing ${kind}:${id}`);
    const used_in = typeof rec.used_in === "string" ? rec.used_in : "";
    return { kind: kind as NarrativeCitation["kind"], id, used_in };
  });

  return {
    executive_summary,
    strategist_view,
    macro_overview,
    what_changed,
    key_takeaways,
    fx_commentary,
    rates_commentary,
    equities_commentary,
    commodities_commentary,
    risk_tone,
    citations,
  };
}
