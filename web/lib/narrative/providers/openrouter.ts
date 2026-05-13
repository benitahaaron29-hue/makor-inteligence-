/**
 * OpenRouter Chat Completions provider.
 *
 * Endpoint: https://openrouter.ai/api/v1/chat/completions
 * Auth:     Bearer ${OPENROUTER_API_KEY}
 * Shape:    OpenAI-compatible (system + user messages, max_tokens,
 *           temperature). Translates the response into the same
 *           LLMResponse shape Anthropic uses so the narrative service
 *           is provider-agnostic downstream.
 *
 * Default model is `deepseek/deepseek-chat`. Override via LLM_MODEL.
 * OpenRouter aliases dozens of providers under one API — any model id
 * documented at openrouter.ai/models works here without code changes.
 */

import type { LLMProvider, LLMCallParams, LLMResponse } from "./base";
import { resolveModelEnv } from "./base";

const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "deepseek/deepseek-chat";
const FETCH_TIMEOUT_MS = 30_000;

interface OpenRouterMessage {
  role: "assistant" | "user" | "system";
  content: string;
}

interface OpenRouterChoice {
  index: number;
  message: OpenRouterMessage;
  finish_reason: string | null;
}

interface OpenRouterSuccess {
  id: string;
  object: string;
  model: string;
  choices: OpenRouterChoice[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface OpenRouterError {
  error?: { message?: string; code?: number | string };
}

/**
 * Public-attribution headers OpenRouter recommends. These are optional;
 * setting them attributes traffic to this deployment in the OpenRouter
 * dashboard and (in some cases) unlocks model-specific rate-limit
 * tiers. Pulls the public site URL from NEXT_PUBLIC_SITE_URL when set
 * so the attribution matches the deployment.
 */
function attributionHeaders(): Record<string, string> {
  const referer = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  const headers: Record<string, string> = {
    "X-Title": "Makor Intelligence Platform",
  };
  if (referer && /^https?:\/\//i.test(referer)) {
    headers["HTTP-Referer"] = referer;
  }
  return headers;
}

export const openrouterProvider: LLMProvider = {
  name: "openrouter",
  defaultModel: DEFAULT_MODEL,

  keyConfigured(): boolean {
    return (process.env.OPENROUTER_API_KEY ?? "").trim().length > 0;
  },

  modelName(): string {
    return resolveModelEnv() ?? DEFAULT_MODEL;
  },

  async call(params: LLMCallParams): Promise<LLMResponse> {
    const key = (process.env.OPENROUTER_API_KEY ?? "").trim();
    if (!key) throw new Error("OPENROUTER_API_KEY not configured");

    const model = this.modelName();
    const body = JSON.stringify({
      model,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      messages: [
        { role: "system", content: params.system },
        { role: "user", content: params.user },
      ],
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const started_at = Date.now();

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
          ...attributionHeaders(),
        },
        cache: "no-store",
        signal: controller.signal,
        body,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`openrouter network: ${msg}`);
    } finally {
      clearTimeout(timer);
    }

    const latency_ms = Date.now() - started_at;
    const raw = await res.text();

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(raw) as OpenRouterError;
        if (parsed?.error?.message) detail = `${detail}: ${parsed.error.message}`;
      } catch {
        /* keep generic detail */
      }
      throw new Error(`openrouter ${detail}`);
    }

    let parsed: OpenRouterSuccess;
    try {
      parsed = JSON.parse(raw) as OpenRouterSuccess;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`openrouter bad JSON: ${msg}`);
    }

    const text = parsed.choices?.[0]?.message?.content ?? "";
    if (!text) throw new Error("openrouter: empty content");

    return {
      text,
      model: parsed.model ?? model,
      input_tokens: parsed.usage?.prompt_tokens ?? 0,
      output_tokens: parsed.usage?.completion_tokens ?? 0,
      latency_ms,
    };
  },
};
