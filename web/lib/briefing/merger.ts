/**
 * Pure narrative-merge helper, shared by server (full sync path,
 * `/api/narrative` debug introspection) and client (hydration after
 * page load).
 *
 * Takes a shell BriefingRead (template content in narrative-driven
 * slots) plus an optionally-null NarrativeOutput and returns a new
 * BriefingRead with the LLM-generated content folded in. When the
 * LLM produced nothing for a given field (`null` narrative, or the
 * field came back as "source data insufficient"), the shell's
 * template content is preserved.
 *
 * Critically this file imports zero server-only modules — no
 * `process.env`, no `cacheGet`, no LLM providers. The client bundle
 * can import it freely.
 */

import type { BriefingRead, ProvenanceEntry, RiskTone } from "@/lib/types/briefing";
import type {
  NarrativeOutput,
  NarrativeDiagnostics,
} from "@/lib/narrative/types";
import { isLLMFieldUsable } from "@/lib/narrative/usable";

/** Replace the shell value with the LLM value only when usable. */
function pick(shellValue: string, llmValue: string | undefined): string {
  return isLLMFieldUsable(llmValue) ? (llmValue as string) : shellValue;
}

/**
 * Build the post-hydration provenance line for the "narrative" section.
 * Mirrors the shape the generator writes on the full sync path so the
 * footer reads identically whether the briefing was assembled server-
 * side with the LLM baked in or hydrated client-side after page load.
 */
function buildNarrativeProvenance(d: NarrativeDiagnostics): ProvenanceEntry {
  const providerLabel =
    (d.last_provider ?? d.provider) === "openrouter" ? "OpenRouter" : "Anthropic";
  const sources =
    d.last_result === "cache"
      ? `${providerLabel} · ${d.last_model} (cached)`
      : `${providerLabel} · ${d.last_model} (${d.last_input_tokens}→${d.last_output_tokens} tokens, ${d.last_latency_ms}ms)`;
  return {
    section: "narrative",
    sources: [sources],
    as_of: d.last_call_at ? d.last_call_at.slice(11, 16) + " UTC" : "—",
  };
}

/**
 * Merge an LLM narrative into a shell briefing. Returns the original
 * briefing reference when narrative is null (no-op fast path) so React
 * referential-equality checks don't fire a re-render.
 *
 * When `diagnostics` is provided (from the /api/narrative response),
 * the intelligence.provenance "narrative" entry is rewritten to reflect
 * the actual model / tokens / latency of this hydration pass — without
 * the rewrite the footer would still read "narrative hydrating
 * asynchronously" after the LLM call completed.
 */
export function mergeNarrativeIntoBriefing(
  shell: BriefingRead,
  narrative: NarrativeOutput | null,
  diagnostics?: NarrativeDiagnostics,
): BriefingRead {
  if (!narrative) return shell;

  const intel = shell.intelligence;
  const refreshedProvenance: ProvenanceEntry[] | undefined = intel
    ? (() => {
        const others = intel.provenance.filter((p) => p.section !== "narrative");
        const narrLine = diagnostics ? buildNarrativeProvenance(diagnostics) : intel.provenance.find((p) => p.section === "narrative");
        return narrLine ? [...others, narrLine] : others;
      })()
    : undefined;

  return {
    ...shell,
    headline: pick(shell.headline, narrative.strategist_view.headline),
    executive_summary: pick(shell.executive_summary, narrative.executive_summary),
    fx_commentary: pick(shell.fx_commentary, narrative.fx_commentary),
    rates_commentary: pick(shell.rates_commentary, narrative.rates_commentary),
    equities_commentary: pick(shell.equities_commentary, narrative.equities_commentary),
    commodities_commentary: pick(shell.commodities_commentary, narrative.commodities_commentary),
    risk_tone: (narrative.risk_tone ?? shell.risk_tone) as RiskTone,
    data_provenance: "live",
    demo_disclosure: null,
    // Replace generation metadata's narrative_* fields with the live
    // diagnostics from this pass so /api/diag (and the Briefing meta
    // rail) reflect what was actually rendered. Falls back to the
    // shell's existing metadata when diagnostics were not passed in.
    generation_metadata: {
      ...shell.generation_metadata,
      render_stage: "full",
      ...(diagnostics
        ? {
            narrative_provider: diagnostics.provider,
            narrative_last_provider: diagnostics.last_provider,
            narrative_model: diagnostics.last_model,
            narrative_result: diagnostics.last_result,
            narrative_key_configured: diagnostics.key_configured,
            narrative_last_error: diagnostics.last_error,
            narrative_input_tokens: diagnostics.last_input_tokens,
            narrative_output_tokens: diagnostics.last_output_tokens,
            narrative_latency_ms: diagnostics.last_latency_ms,
            narrative_context_hash: diagnostics.last_context_hash,
            narrative_field_sources: diagnostics.last_field_sources,
            narrative_field_counts: diagnostics.last_field_counts,
          }
        : {}),
    },
    generation_source: "anthropic",
    model_name: diagnostics?.last_model ?? shell.model_name,
    intelligence: intel
      ? {
          ...intel,
          strategist_view: {
            headline: pick(intel.strategist_view.headline, narrative.strategist_view.headline),
            body: pick(intel.strategist_view.body, narrative.strategist_view.body),
          },
          macro_overview: {
            ...intel.macro_overview,
            opening: pick(intel.macro_overview.opening, narrative.macro_overview.opening),
            whats_moving: pick(intel.macro_overview.whats_moving, narrative.macro_overview.whats_moving),
            rates_view: pick(intel.macro_overview.rates_view, narrative.macro_overview.rates_view),
            cross_asset_thesis: pick(intel.macro_overview.cross_asset_thesis, narrative.macro_overview.cross_asset_thesis),
          },
          what_changed: {
            summary: pick(intel.what_changed.summary, narrative.what_changed.summary),
            deltas:
              narrative.what_changed.deltas && narrative.what_changed.deltas.length > 0
                ? narrative.what_changed.deltas
                : intel.what_changed.deltas,
          },
          key_takeaways:
            narrative.key_takeaways && narrative.key_takeaways.length > 0
              ? narrative.key_takeaways
              : intel.key_takeaways,
          provenance: refreshedProvenance ?? intel.provenance,
        }
      : intel,
  };
}
