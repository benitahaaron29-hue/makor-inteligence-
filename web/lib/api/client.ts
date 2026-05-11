/**
 * Server-side API client for the Makor FastAPI backend.
 * Used inside Server Components and Server Actions.
 *
 * In dev, Next.js rewrites /api/* to ${NEXT_PUBLIC_API_ORIGIN}/api/* — but
 * Server Components don't go through the rewrite, so we resolve the full
 * upstream URL directly.
 */

const API_ORIGIN =
  process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://127.0.0.1:8000";
const API_BASE = `${API_ORIGIN}/api/v1`;

export class ApiError extends Error {
  constructor(public status: number, message: string, public detail?: unknown) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
  /** Next.js cache strategy. Defaults to no-store (always fresh). */
  cache?: RequestCache;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    cache: options.cache ?? "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    let detail: unknown = undefined;
    try { detail = await res.json(); } catch { /* not JSON */ }
    const msg =
      detail && typeof detail === "object" && "detail" in detail
        ? String((detail as { detail: unknown }).detail)
        : `${res.status} ${res.statusText}`;
    throw new ApiError(res.status, msg, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export { API_BASE, API_ORIGIN };
