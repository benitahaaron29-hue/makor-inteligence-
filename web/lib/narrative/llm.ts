/**
 * LLM facade — provider-agnostic entry point for the narrative service.
 *
 * Selection (server-side env vars, never NEXT_PUBLIC_*):
 *
 *   LLM_PROVIDER=openrouter   → OpenRouter (default when unset)
 *   LLM_PROVIDER=anthropic    → direct Anthropic Messages API
 *
 *   LLM_MODEL=<id>            → model override; works across providers
 *                                 e.g. "deepseek/deepseek-chat" (openrouter)
 *                                 or "claude-sonnet-4-6" (anthropic)
 *   NARRATIVE_MODEL=<id>      → back-compat with the previous direct-
 *                                 Anthropic config; honoured if LLM_MODEL
 *                                 is unset.
 *
 *   OPENROUTER_API_KEY        → required when provider=openrouter
 *   ANTHROPIC_API_KEY         → required when provider=anthropic
 *
 * Everything downstream — context builder, prompt, validator, service
 * orchestration, 30-min cache, per-field-source map, probe endpoint —
 * imports from this file and treats `callLLM` as a single uniform
 * function. Swapping providers is an env-var change, never a code
 * change downstream.
 *
 * Default selection logic: explicit LLM_PROVIDER wins. When unset,
 * OpenRouter is the default (per platform direction). We do NOT
 * silently fall back to whichever provider has a key — that would
 * hide a misconfigured deployment. If LLM_PROVIDER=openrouter but
 * the key is missing, the service returns null with last_result
 * "no-key" and the diagnostic surfaces it via /api/diag.
 */

import { openrouterProvider } from "./providers/openrouter";
import { anthropicProvider } from "./providers/anthropic";
import type {
  LLMProvider,
  LLMCallParams,
  LLMResponse,
  LLMProviderName,
} from "./providers/base";

export type { LLMCallParams, LLMResponse, LLMProviderName } from "./providers/base";

const PROVIDERS: Record<LLMProviderName, LLMProvider> = {
  openrouter: openrouterProvider,
  anthropic: anthropicProvider,
};

function envProvider(): LLMProviderName | null {
  const raw = (process.env.LLM_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "openrouter" || raw === "anthropic") return raw;
  return null;
}

/** Resolve which provider should be used right now. */
export function activeProvider(): LLMProvider {
  const explicit = envProvider();
  if (explicit) return PROVIDERS[explicit];
  return openrouterProvider;
}

/** True when the active provider has its API key configured. */
export function llmKeyConfigured(): boolean {
  return activeProvider().keyConfigured();
}

/** Model id the active provider will use for the next call. */
export function llmModel(): string {
  return activeProvider().modelName();
}

/** Name of the active provider — surfaced in diagnostics + provenance. */
export function llmProviderName(): LLMProviderName {
  return activeProvider().name;
}

/**
 * Call the active LLM provider. Throws on any failure; the narrative
 * service catches and falls back to the existing template content.
 */
export async function callLLM(params: LLMCallParams): Promise<LLMResponse> {
  return activeProvider().call(params);
}
