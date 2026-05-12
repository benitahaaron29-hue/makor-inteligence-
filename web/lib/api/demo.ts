/**
 * Demo-mode plumbing.
 *
 * The platform can run in two configurations:
 *
 *   1. Live   — NEXT_PUBLIC_API_ORIGIN points at a running data service.
 *                API calls hit the upstream; failures bubble up to the UI.
 *   2. Demo   — NEXT_PUBLIC_DEMO_MODE=true, or the data service is
 *                unreachable. Every fetch falls back to bundled JSON
 *                under web/public/mock/ and the UI never surfaces a
 *                connection error to the viewer.
 *
 * The loader works on both server (Node fs) and client (HTTP fetch) so the
 * same call sites can be used from Server Components, Route Handlers, and
 * Client Components.
 */

const isServer = typeof window === "undefined";

/** True when the deployment is explicitly running in demo mode. */
export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}

/**
 * Resolve and cache a JSON mock from web/public/mock/.
 * Server-side reads from disk; client-side fetches the same file via HTTP
 * (it's a static asset, served by Next.js without round-tripping the API).
 */
const CACHE: Record<string, unknown> = {};

export async function loadMock<T>(filename: string): Promise<T> {
  if (CACHE[filename] !== undefined) return CACHE[filename] as T;

  let parsed: unknown;

  if (isServer) {
    const { readFile } = await import("node:fs/promises");
    const path = await import("node:path");
    const candidates = [
      path.join(process.cwd(), "public", "mock", filename),
      path.join(process.cwd(), "web", "public", "mock", filename),
    ];
    let lastErr: unknown = null;
    for (const p of candidates) {
      try {
        const text = await readFile(p, "utf8");
        parsed = JSON.parse(text);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (parsed === undefined) {
      throw new Error(`mock not found: ${filename} (${String(lastErr)})`);
    }
  } else {
    const res = await fetch(`/mock/${filename}`, { cache: "force-cache" });
    if (!res.ok) throw new Error(`mock fetch ${res.status}: ${filename}`);
    parsed = await res.json();
  }

  CACHE[filename] = parsed;
  return parsed as T;
}

/**
 * Try a live API call first; on any failure, fall back to the mock.
 * Used by the briefings + sources fetchers so the UI never sees a
 * connection error in demo or partial-outage scenarios.
 *
 * If `force` is true (or `isDemoMode()` is true), skip the live call
 * entirely — useful for production demo deployments where there is no
 * upstream and trying to reach one just adds latency + console noise.
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
