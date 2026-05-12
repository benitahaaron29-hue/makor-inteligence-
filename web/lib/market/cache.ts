/**
 * Process-local TTL cache.
 *
 * Keyed by `${instrument}::${adapter}` so the same instrument fetched from
 * a different adapter has its own slot. On Vercel each serverless function
 * instance has its own cache — acceptable for desk-scale traffic. If we
 * ever outgrow it we swap this module for an Upstash/Redis client; the
 * shape (get/set/with-ttl) stays the same.
 *
 * Deliberately tiny: no LRU eviction, no size cap. The instrument set is
 * bounded (~30 in steady state) so the map is naturally tiny too.
 */

interface CacheEntry<T> {
  value: T;
  expires_at: number;
}

const STORE = new Map<string, CacheEntry<unknown>>();

export function cacheGet<T>(key: string): T | null {
  const entry = STORE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires_at) {
    STORE.delete(key);
    return null;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttl_seconds: number): void {
  STORE.set(key, { value, expires_at: Date.now() + ttl_seconds * 1000 });
}

/** Test/admin helper — drop a single key or the whole cache. */
export function cacheClear(key?: string): void {
  if (key === undefined) STORE.clear();
  else STORE.delete(key);
}
