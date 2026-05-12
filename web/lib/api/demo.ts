/**
 * Demo-mode plumbing — fully isomorphic, Vercel-build-safe.
 *
 * Mocks are statically imported as JSON modules so the bundler inlines them
 * into whichever bundle needs them (server, edge, or client). There is no
 * fs / path / node:* import anywhere in the demo path, and no reliance on
 * process.cwd() — which means the build is identical locally, on Vercel,
 * and in every Next.js runtime.
 *
 *   isDemoMode()       — true when NEXT_PUBLIC_DEMO_MODE === "true"
 *   loadMock<T>(name)  — returns the bundled JSON for the named mock
 *   withMockFallback() — call live first, fall back to mock on failure
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

/** True when the deployment is explicitly running in demo mode. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
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
  // Cast through unknown — the JSON modules are typed as the literal
  // shapes inferred by TS, but call sites want their domain types.
  return entry as unknown as T;
}

/**
 * Try a live API call first; on any failure (or when demo mode is forced),
 * fall back to the mock. Used by the briefings and sources fetchers so
 * the UI never surfaces a connection error to a demo viewer.
 */
export async function withMockFallback<T>(
  liveFn: () => Promise<T>,
  mockFn: () => Promise<T>,
  options: { force?: boolean } = {},
): Promise<T> {
  if (options.force || isDemoMode()) {
    return mockFn();
  }
  try {
    return await liveFn();
  } catch {
    return mockFn();
  }
}
