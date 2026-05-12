/**
 * Demo-mode plumbing — fully isomorphic, Vercel-build-safe.
 *
 * Mocks are statically imported as JSON modules so the bundler inlines them
 * into whichever bundle needs them (server, edge, or client). There is no
 * fs / path / node:* import anywhere in the demo path, and no reliance on
 * process.cwd().
 *
 *   isDemoMode()       — strict boolean: true iff DEMO_MODE or
 *                        NEXT_PUBLIC_DEMO_MODE is the literal string "true"
 *                        (case-insensitive, trimmed). Everything else
 *                        (including "false", "1", "0", "", undefined) is
 *                        live mode.
 *   loadMock<T>(name)  — returns the bundled JSON for the named mock
 *   withMockFallback() — call live first; on failure propagate the error.
 *                        Mock is ONLY served when demo mode is explicitly
 *                        on. Live mode never silently serves mock data.
 *
 * Why two env vars are honoured:
 *
 *   DEMO_MODE              — server-only. Read at RUNTIME by Next.js.
 *                            Changing this env var on Vercel takes effect
 *                            on the next request, no rebuild required.
 *                            Preferred for production toggling.
 *
 *   NEXT_PUBLIC_DEMO_MODE  — client-readable. Inlined at BUILD TIME by
 *                            Next.js. Changing it requires a Vercel
 *                            rebuild without build cache to take effect.
 *                            Honoured for back-compat.
 *
 * If both are set, DEMO_MODE wins.
 */

import latestBriefingMock from "./mocks/latest-briefing.json";
import recentBriefingsMock from "./mocks/recent-briefings.json";
import sourcesMock from "./mocks/sources.json";

const REGISTRY = {
  "latest-briefing.json": latestBriefingMock,
  "recent-briefings.json": recentBriefingsMock,
  "sources.json": sourcesMock,
} as const;

export type MockName = keyof typeof REGISTRY;

/** Parse a single env value defensively — strict "true" after trim+lower. */
function parseFlag(raw: string | undefined): boolean {
  if (typeof raw !== "string") return false;
  return raw.trim().toLowerCase() === "true";
}

/**
 * True when the deployment is explicitly running in demo mode.
 *
 * Resolution order:
 *   1. DEMO_MODE              (runtime, no rebuild needed)
 *   2. NEXT_PUBLIC_DEMO_MODE  (build-time inlined, back-compat)
 *
 * ONLY the literal string "true" (trim + lowercase) enables demo mode.
 * "false", "1", "", undefined and any other value all mean LIVE.
 */
export function isDemoMode(): boolean {
  if (process.env.DEMO_MODE !== undefined) {
    return parseFlag(process.env.DEMO_MODE);
  }
  return parseFlag(process.env.NEXT_PUBLIC_DEMO_MODE);
}

/**
 * Diagnostic helper — surface every input that contributes to the
 * isDemoMode() decision. Exposed via /api/diag so an operator can verify
 * what the running deployment actually sees, instead of guessing whether
 * the Vercel env var took effect.
 */
export function demoModeDiagnostics() {
  return {
    demo_mode: isDemoMode(),
    inputs: {
      DEMO_MODE: process.env.DEMO_MODE ?? null,
      NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE ?? null,
    },
    resolution: process.env.DEMO_MODE !== undefined ? "DEMO_MODE" : "NEXT_PUBLIC_DEMO_MODE",
    NODE_ENV: process.env.NODE_ENV ?? null,
  };
}

/**
 * Resolve a bundled mock by filename. Marked async so call sites stay
 * shape-compatible with the previous fs-backed implementation.
 */
export async function loadMock<T>(filename: string): Promise<T> {
  const entry = REGISTRY[filename as MockName];
  if (entry === undefined) {
    throw new Error(`unknown mock: ${filename}`);
  }
  return entry as unknown as T;
}

/**
 * Run the live fetcher; on failure, propagate the error.
 *
 * Mock data is served ONLY when demo mode is explicitly on (DEMO_MODE or
 * NEXT_PUBLIC_DEMO_MODE === "true"), or when the caller passes
 * `options.force = true`. In live mode we deliberately do NOT silently
 * fall back to mock — that would let synthesised data leak into a
 * production deployment under the guise of "the backend was down for a
 * minute," violating the platform's primary integrity rule:
 *
 *     never fabricate market data. If unavailable, show unavailable.
 *
 * Server Components and Route Handlers that call this MUST handle the
 * thrown error and render an appropriate unavailable / error state.
 */
export async function withMockFallback<T>(
  liveFn: () => Promise<T>,
  mockFn: () => Promise<T>,
  options: { force?: boolean } = {},
): Promise<T> {
  if (options.force || isDemoMode()) {
    return mockFn();
  }
  // Live mode: no silent fallback. Errors bubble up so the UI can render
  // an honest "data unavailable" instead of mock data dressed as live.
  return liveFn();
}
