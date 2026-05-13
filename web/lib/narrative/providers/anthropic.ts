/**
 * Anthropic Claude Messages API provider.
 *
 * Retained as an alternate transport — set LLM_PROVIDER=anthropic and
 * configure ANTHROPIC_API_KEY to route through this provider instead
 * of OpenRouter. The implementation matches the previous direct-API
 * client byte-for-byte; only the call surface moved behind the
 * LLMProvider interface so the rest of the narrative pipeline stays
 * shape-stable across vendor swaps.
 */

import type { LLMProvider, LLMCallParams, LLMResponse } from "./base";
import { resolveLLMTimeoutMs, resolveModelEnv } from "./base";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_VERSION = "2023-06-01";

interface AnthropicSuccess {
  id: string;
  type: "message";
  content: Array<{ type: "text"; text: string }>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

interface AnthropicError {
  type: "error";
  error: { type: string; message: string };
}

export const anthropicProvider: LLMProvider = {
  name: "anthropic",
  defaultModel: DEFAULT_MODEL,

  keyConfigured(): boolean {
    return (process.env.ANTHROPIC_API_KEY ?? "").trim().length > 0;
  },

  modelName(): string {
    return resolveModelEnv() ?? DEFAULT_MODEL;
  },

  async call(params: LLMCallParams): Promise<LLMResponse> {
    const key = (process.env.ANTHROPIC_API_KEY ?? "").trim();
    if (!key) throw new Error("ANTHROPIC_API_KEY not configured");

    const model = this.modelName();
    const body = JSON.stringify({
      model,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      system: params.system,
      messages: [{ role: "user", content: params.user }],
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), resolveLLMTimeoutMs());
    const started_at = Date.now();

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        cache: "no-store",
        signal: controller.signal,
        body,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`anthropic network: ${msg}`);
    } finally {
      clearTimeout(timer);
    }

    const latency_ms = Date.now() - started_at;
    const raw = await res.text();

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(raw) as AnthropicError;
        if (parsed?.error?.message) detail = `${detail}: ${parsed.error.message}`;
      } catch {
        /* keep generic detail */
      }
      throw new Error(`anthropic ${detail}`);
    }

    let parsed: AnthropicSuccess;
    try {
      parsed = JSON.parse(raw) as AnthropicSuccess;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`anthropic bad JSON: ${msg}`);
    }

    const text = parsed.content?.[0]?.text ?? "";
    if (!text) throw new Error("anthropic: empty content");

    return {
      text,
      model: parsed.model ?? model,
      input_tokens: parsed.usage?.input_tokens ?? 0,
      output_tokens: parsed.usage?.output_tokens ?? 0,
      latency_ms,
    };
  },
};
