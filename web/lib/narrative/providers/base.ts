/**
 * LLM provider abstraction.
 *
 * Every concrete provider (anthropic, openrouter, ...) implements this
 * interface. The rest of the narrative pipeline — context builder,
 * prompt, validator, service orchestration, cache, fallback templates —
 * does NOT know which vendor is serving today. Swapping providers is
 * an env-var change, never a code change downstream.
 *
 * Two normalisations the interface enforces:
 *
 *   1. Token usage. Anthropic emits `usage.input_tokens` /
 *      `usage.output_tokens`. OpenAI-compatible APIs (incl. OpenRouter)
 *      emit `usage.prompt_tokens` / `usage.completion_tokens`. Each
 *      provider's `call()` translates to the same LLMResponse field
 *      names so the service's diagnostics stay shape-stable.
 *
 *   2. Error wrapping. Each provider catches network / HTTP / JSON
 *      errors and re-throws an Error whose message starts with the
 *      provider name (e.g. "openrouter HTTP 429: ..."). The validator
 *      + service treat the error string as the diagnostic value.
 */

export interface LLMCallParams {
  system: string;
  user: string;
  max_tokens: number;
  temperature: number;
}

export interface LLMResponse {
  text: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms: number;
}

export type LLMProviderName = "anthropic" | "openrouter";

export interface LLMProvider {
  readonly name: LLMProviderName;
  /** Provider-default model id. Used when LLM_MODEL / NARRATIVE_MODEL is unset. */
  readonly defaultModel: string;
  /** True when this provider's API key env var is configured. */
  keyConfigured(): boolean;
  /** Resolved model id (LLM_MODEL ?? NARRATIVE_MODEL ?? defaultModel). */
  modelName(): string;
  /** Call the upstream. Throws on any failure; service catches and falls back. */
  call(params: LLMCallParams): Promise<LLMResponse>;
}

/**
 * Resolve the operator-supplied model env var. Honoured by ALL providers
 * so a single LLM_MODEL value works regardless of which transport is
 * active. NARRATIVE_MODEL is the pre-OpenRouter back-compat name.
 */
export function resolveModelEnv(): string | null {
  const raw = (process.env.LLM_MODEL ?? process.env.NARRATIVE_MODEL ?? "").trim();
  return raw.length > 0 ? raw : null;
}

/**
 * Resolve the hard fetch timeout for an upstream LLM call. Honoured by
 * ALL providers so the operator has a single env var to tune.
 *
 * Default: 45 seconds. Sits comfortably inside Vercel Hobby's 60-second
 * function budget while giving the LLM enough room to complete on cold
 * paths with a dense context. Bump to 50s if cold timeouts keep firing;
 * never above 55s (response handling + network round-trip needs ~5s
 * headroom or the route handler itself trips Vercel's hard kill).
 */
export function resolveLLMTimeoutMs(): number {
  const raw = (process.env.LLM_TIMEOUT_MS ?? "").trim();
  if (!raw) return 45_000;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 5_000 || n > 55_000) return 45_000;
  return n;
}
