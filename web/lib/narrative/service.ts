/**
 * Narrative service — orchestrates: context → LLM → validate → cache.
 *
 * Flow:
 *   1. Demo-mode guard: return null (caller uses template).
 *   2. No API key guard: return null + log diagnostic.
 *   3. Build the context document from input data.
 *   4. Check cache keyed by context.hash. 30-min TTL.
 *   5. Call Claude with the strict system prompt + context.
 *   6. Validate the response. On any failure, return null.
 *   7. Cache the validated output and return it.
 *
 * The caller (generator) treats `null` as "use the existing template
 * content for the affected fields". This guarantees the briefing always
 * renders — the LLM is an upgrade, never a hard dependency.
 */

import { cacheGet, cacheSet } from "@/lib/market/cache";
import { isDemoMode } from "@/lib/api/demo";
import { buildContext, type ContextInput } from "./context";
import { NARRATIVE_SYSTEM_PROMPT, buildUserMessage } from "./prompt";
import { callClaude, llmKeyConfigured, llmModel } from "./llm";
import { validateNarrative } from "./validator";
import type { NarrativeOutput, NarrativeDiagnostics } from "./types";

const CACHE_TTL_SECONDS = 30 * 60; // 30 min
const CACHE_KEY_PREFIX = "narrative::";
const MAX_OUTPUT_TOKENS = 2_000;
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
};

function record(result: NonNullable<NarrativeDiagnostics["last_result"]>, error: string | null) {
  DIAG.last_call_at = new Date().toISOString();
  DIAG.last_result = result;
  DIAG.last_error = error;
  DIAG.key_configured = llmKeyConfigured();
}

/**
 * Synthesise the narrative. Returns the validated NarrativeOutput on
 * success, or null on any failure (demo mode, no key, network error,
 * validation reject). The generator handles `null` by using the
 * existing template content for the affected fields.
 */
export async function synthesise(input: ContextInput): Promise<NarrativeOutput | null> {
  if (isDemoMode()) {
    record("demo-mode", null);
    return null;
  }
  if (!llmKeyConfigured()) {
    record("no-key", "ANTHROPIC_API_KEY not configured");
    return null;
  }

  const ctx = buildContext(input);
  const cacheKey = `${CACHE_KEY_PREFIX}${ctx.hash}`;
  const cached = cacheGet<NarrativeOutput>(cacheKey);
  if (cached) {
    record("cache", null);
    return cached;
  }

  let llm;
  try {
    llm = await callClaude({
      system: NARRATIVE_SYSTEM_PROMPT,
      user: buildUserMessage(ctx.text),
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: TEMPERATURE,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record("api-fail", msg);
    return null;
  }

  DIAG.last_model = llm.model;
  DIAG.last_latency_ms = llm.latency_ms;
  DIAG.last_input_tokens = llm.input_tokens;
  DIAG.last_output_tokens = llm.output_tokens;

  let validated: NarrativeOutput;
  try {
    validated = validateNarrative(llm.text, ctx);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    record("validate-fail", msg);
    return null;
  }

  cacheSet(cacheKey, validated, CACHE_TTL_SECONDS);
  record("ok", null);
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
  };
}
