/**
 * Narrative service — orchestrates: context → LLM → validate → cache.
 *
 * Flow (verbose console.log at each step so Vercel Function Logs show
 * the exact failure mode without needing to redeploy):
 *
 *   1. Demo-mode guard: return null + log "demo-mode".
 *   2. No-key guard: return null + log "no-key".
 *   3. Build context. Log context hash + counts.
 *   4. Cache check. If hit: log "cache" + return.
 *   5. Call Claude. Log latency + token usage.
 *   6. Validate. Log "ok" or "validate-fail" + reason.
 *   7. Cache and return; OR fall back to null + log reason.
 *
 * Diagnostics carry a per-field "llm" | "template" map computed after
 * validation. This is the operator's single-glance view of whether the
 * LLM actually populated each section.
 */

import { cacheGet, cacheSet } from "@/lib/market/cache";
import { isDemoMode } from "@/lib/api/demo";
import { buildContext, type ContextInput } from "./context";
import { NARRATIVE_SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { callLLM, llmKeyConfigured, llmModel, llmProviderName } from "./llm";
import { validateNarrative } from "./validator";
import { isLLMFieldUsable } from "./usable";
import {
  NARRATIVE_FIELDS,
  type FieldSource,
  type NarrativeField,
  type NarrativeOutput,
  type NarrativeDiagnostics,
} from "./types";

// Re-export so downstream code that historically imported the helper
// from this service module keeps working — the canonical home is now
// `./usable` (kept dependency-light so it can ship to the client bundle).
export { isLLMFieldUsable };

const CACHE_TTL_SECONDS = 30 * 60; // 30 min
const CACHE_KEY_PREFIX = "narrative::";
// Phase 3.1 — the analytical-pattern prompt asks every commentary
// sentence to carry a mechanism / linkage / positioning angle, which
// raises per-section density. 2_500 gives headroom for the 12 prose
// fields + key_takeaways + citations[] without forcing the model to
// truncate the cross-asset thesis or the final commentaries.
const MAX_OUTPUT_TOKENS = 2_500;
const TEMPERATURE = 0.2;

const DIAG: NarrativeDiagnostics = {
  last_call_at: null,
  last_result: null,
  last_error: null,
  last_model: null,
  last_latency_ms: null,
  last_input_tokens: null,
  last_output_tokens: null,
  key_configured: llmKeyConfigured(),
  provider: llmProviderName(),
  last_provider: null,
  last_field_sources: null,
  last_field_counts: null,
  last_context_hash: null,
  last_cache_hit_origin: null,
};

function record(
  result: NonNullable<NarrativeDiagnostics["last_result"]>,
  error: string | null,
) {
  DIAG.last_call_at = new Date().toISOString();
  DIAG.last_result = result;
  DIAG.last_error = error;
  DIAG.key_configured = llmKeyConfigured();
}

function getNarrativeField(n: NarrativeOutput, path: NarrativeField): string {
  const parts = path.split(".");
  let cur: unknown = n;
  for (const p of parts) {
    if (typeof cur !== "object" || cur === null) return "";
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === "string" ? cur : "";
}

function computeFieldSources(
  narrative: NarrativeOutput | null,
): Record<NarrativeField, FieldSource> {
  const map = {} as Record<NarrativeField, FieldSource>;
  if (!narrative) {
    for (const f of NARRATIVE_FIELDS) map[f] = "template";
    return map;
  }
  for (const f of NARRATIVE_FIELDS) {
    map[f] = isLLMFieldUsable(getNarrativeField(narrative, f)) ? "llm" : "template";
  }
  return map;
}

function countSources(map: Record<NarrativeField, FieldSource>): { llm: number; template: number } {
  let llm = 0;
  let template = 0;
  for (const f of NARRATIVE_FIELDS) {
    if (map[f] === "llm") llm += 1;
    else template += 1;
  }
  return { llm, template };
}

/** Tag every console.log from this module so it's grepable in Vercel logs. */
function log(level: "info" | "warn", event: string, detail: Record<string, unknown> = {}): void {
  const line = `[narrative] ${event}`;
  if (level === "warn") {
    // eslint-disable-next-line no-console
    console.warn(line, detail);
  } else {
    // eslint-disable-next-line no-console
    console.log(line, detail);
  }
}

/**
 * Synthesise the narrative. Returns the validated NarrativeOutput on
 * success, or null on any failure. The generator handles null by using
 * the existing template content for the affected fields.
 */
export async function synthesise(input: ContextInput): Promise<NarrativeOutput | null> {
  if (isDemoMode()) {
    record("demo-mode", null);
    DIAG.last_field_sources = computeFieldSources(null);
    DIAG.last_field_counts = countSources(DIAG.last_field_sources);
    log("info", "skipped:demo-mode");
    return null;
  }

  if (!llmKeyConfigured()) {
    record("no-key", "ANTHROPIC_API_KEY not configured");
    DIAG.last_field_sources = computeFieldSources(null);
    DIAG.last_field_counts = countSources(DIAG.last_field_sources);
    log("warn", "skipped:no-key", {
      hint: "Set ANTHROPIC_API_KEY (server-only, NOT NEXT_PUBLIC_) on Vercel and redeploy without cache.",
    });
    return null;
  }

  const ctx = buildContext(input);
  DIAG.last_context_hash = ctx.hash;
  log("info", "context-built", {
    contextHash: ctx.hash,
    quotes: ctx.counts.quotes,
    calendar: ctx.counts.calendar,
    headlines: ctx.counts.headlines,
    cb_events: ctx.counts.cb_events,
  });

  const cacheKey = `${CACHE_KEY_PREFIX}${ctx.hash}`;
  const cached = cacheGet<NarrativeOutput>(cacheKey);
  if (cached) {
    record("cache", null);
    DIAG.last_cache_hit_origin = ctx.hash;
    DIAG.last_field_sources = computeFieldSources(cached);
    DIAG.last_field_counts = countSources(DIAG.last_field_sources);
    log("info", "cache-hit", {
      contextHash: ctx.hash,
      counts: DIAG.last_field_counts,
    });
    return cached;
  }

  const provider = llmProviderName();
  log("info", "calling-llm", {
    provider,
    model: llmModel(),
    contextHash: ctx.hash,
  });

  let llm;
  try {
    llm = await callLLM({
      system: NARRATIVE_SYSTEM_PROMPT,
      user: buildUserMessage(ctx.text),
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record("api-fail", msg);
    DIAG.last_provider = provider;
    DIAG.last_field_sources = computeFieldSources(null);
    DIAG.last_field_counts = countSources(DIAG.last_field_sources);
    log("warn", "api-fail", { provider, error: msg });
    return null;
  }

  DIAG.last_provider = provider;
  DIAG.last_model = llm.model;
  DIAG.last_latency_ms = llm.latency_ms;
  DIAG.last_input_tokens = llm.input_tokens;
  DIAG.last_output_tokens = llm.output_tokens;
  log("info", "llm-returned", {
    provider,
    model: llm.model,
    input_tokens: llm.input_tokens,
    output_tokens: llm.output_tokens,
    latency_ms: llm.latency_ms,
  });

  let validated: NarrativeOutput;
  try {
    validated = validateNarrative(llm.text, ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record("validate-fail", msg);
    DIAG.last_field_sources = computeFieldSources(null);
    DIAG.last_field_counts = countSources(DIAG.last_field_sources);
    log("warn", "validate-fail", {
      error: msg,
      // First 400 chars of the model's output so we can see what shape
      // it produced. Never the full body — that bloats Vercel logs and
      // might include large hallucination passages we want filtered.
      sample: llm.text.slice(0, 400),
    });
    return null;
  }

  cacheSet(cacheKey, validated, CACHE_TTL_SECONDS);
  record("ok", null);
  DIAG.last_field_sources = computeFieldSources(validated);
  DIAG.last_field_counts = countSources(DIAG.last_field_sources);
  log("info", "ok", {
    contextHash: ctx.hash,
    counts: DIAG.last_field_counts,
  });
  return validated;
}

export function narrativeDiagnostics(): NarrativeDiagnostics {
  return {
    last_call_at: DIAG.last_call_at,
    last_result: DIAG.last_result,
    last_error: DIAG.last_error,
    last_model: DIAG.last_model ?? llmModel(),
    last_latency_ms: DIAG.last_latency_ms,
    last_input_tokens: DIAG.last_input_tokens,
    last_output_tokens: DIAG.last_output_tokens,
    key_configured: llmKeyConfigured(),
    provider: llmProviderName(),
    last_provider: DIAG.last_provider,
    last_field_sources: DIAG.last_field_sources,
    last_field_counts: DIAG.last_field_counts,
    last_context_hash: DIAG.last_context_hash,
    last_cache_hit_origin: DIAG.last_cache_hit_origin,
  };
}
