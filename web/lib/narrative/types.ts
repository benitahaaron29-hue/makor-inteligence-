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
  /** "q" / "cal" / "hl" / "cb" — kind of context item. */
  kind: "q" | "cal" | "hl" | "cb";
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
 * Diagnostic info exposed via /api/diag and /api/narrative for operator
 * introspection. Never carries the API key or any user data.
 */
export interface NarrativeDiagnostics {
  last_call_at: string | null;
  last_result: "ok" | "cache" | "validate-fail" | "api-fail" | "no-key" | "demo-mode" | null;
  last_error: string | null;
  last_model: string | null;
  last_latency_ms: number | null;
  last_input_tokens: number | null;
  last_output_tokens: number | null;
  /** True when a real ANTHROPIC_API_KEY is configured on the server. */
  key_configured: boolean;
}
