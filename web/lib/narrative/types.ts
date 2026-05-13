/**
 * LLM narrative synthesis — canonical shapes.
 *
 * The narrative service takes the assembled morning context (market
 * quotes + calendar + headlines + central-bank activity) and asks
 * Claude Sonnet 4.6 to produce a JSON payload matching `NarrativeOutput`.
 * The generator then drops those fields into the existing BriefingRead
 * structure — no schema change, no new sections, just smarter content
 * generation.
 *
 * Hard rules enforced by the prompt + validator:
 *
 *   1. The LLM uses ONLY the provided context. It never invents levels,
 *      events, speakers, or policy expectations.
 *   2. Every claim is cited against a context id: [q:N] [cal:N] [hl:N]
 *      [cb:N]. The validator rejects any response whose citations point
 *      to non-existent ids.
 *   3. When context is insufficient for a section, the LLM emits the
 *      literal string "source data insufficient" — the renderer treats
 *      that as a signal to fall back to the existing template content.
 *   4. On ANY failure (network, rate limit, parse error, validation
 *      reject, model refusal), the briefing falls back to the existing
 *      Phase-1 template. The page never goes blank.
 */

export type RiskToneOutput = "risk_on" | "risk_off" | "mixed" | "neutral";

export interface NarrativeCitation {
  /** "q" / "cal" / "hl" / "cb" / "geo" — kind of context item. */
  kind: "q" | "cal" | "hl" | "cb" | "geo";
  /** 1-based id within that kind. */
  id: number;
  /** Which output field used this citation (free-form). */
  used_in: string;
}

/**
 * The exact JSON shape the LLM must produce. The validator enforces
 * field presence, type, and citation referential integrity.
 */
export interface NarrativeOutput {
  executive_summary: string;
  strategist_view: { headline: string; body: string };
  macro_overview: {
    opening: string;
    whats_moving: string;
    rates_view: string;
    cross_asset_thesis: string;
  };
  what_changed: {
    summary: string;
    deltas: string[];
  };
  key_takeaways: Array<{ rank: number; text: string }>;
  fx_commentary: string;
  rates_commentary: string;
  equities_commentary: string;
  commodities_commentary: string;
  risk_tone: RiskToneOutput;
  citations: NarrativeCitation[];
}

/**
 * Per-field outcome at the briefing-render layer. "llm" means the
 * narrative service produced usable content for this field and the
 * generator injected it; "template" means the generator fell back to
 * the existing template string (because the narrative was null OR
 * the LLM returned "source data insufficient" for that field).
 */
export type FieldSource = "llm" | "template";

/**
 * The full list of fields the narrative layer can populate. Used both
 * for the field-source map and as the audit surface for /api/diag.
 */
export const NARRATIVE_FIELDS = [
  "executive_summary",
  "strategist_view.headline",
  "strategist_view.body",
  "macro_overview.opening",
  "macro_overview.whats_moving",
  "macro_overview.rates_view",
  "macro_overview.cross_asset_thesis",
  "what_changed.summary",
  "fx_commentary",
  "rates_commentary",
  "equities_commentary",
  "commodities_commentary",
] as const;

export type NarrativeField = typeof NARRATIVE_FIELDS[number];

/**
 * Diagnostic info exposed via /api/diag and /api/narrative for operator
 * introspection. Never carries the API key or any user data.
 *
 * field_sources: per-field "llm" | "template" map computed by the
 * service after validation. Lets an operator see at a glance which
 * sections came from Claude vs the fallback. When the LLM has not yet
 * been called this turn, the map carries the last computed values
 * (handy for verifying the pipeline after a successful render).
 */
export interface NarrativeDiagnostics {
  last_call_at: string | null;
  last_result: "ok" | "cache" | "validate-fail" | "api-fail" | "no-key" | "demo-mode" | null;
  last_error: string | null;
  last_model: string | null;
  last_latency_ms: number | null;
  last_input_tokens: number | null;
  last_output_tokens: number | null;
  /** True when the active provider's API key is configured on the server. */
  key_configured: boolean;
  /** Active LLM transport: "openrouter" or "anthropic" (resolved from LLM_PROVIDER). */
  provider: "openrouter" | "anthropic";
  /** Provider used for the most recent invocation. Null when never called. */
  last_provider: "openrouter" | "anthropic" | null;
  /** Per-field outcome for the most recent narrative pass. */
  last_field_sources: Record<NarrativeField, FieldSource> | null;
  /** Counts of fields that landed in each bucket. Quick "did the LLM do anything?" gauge. */
  last_field_counts: { llm: number; template: number } | null;
  /** Hash of the most recent context document (for cache-key sanity). */
  last_context_hash: string | null;
  /** When the cache returned a hit, what was the cached entry's last_result. */
  last_cache_hit_origin: string | null;
}
