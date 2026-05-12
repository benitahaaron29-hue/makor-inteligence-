/**
 * Central-bank service — orchestration layer.
 *
 * Flow per call:
 *   1. Demo-mode guard: return [] when DEMO_MODE is on.
 *   2. Cache hit: return cached list (5 min TTL).
 *   3. Fetch every configured CB feed in parallel (Promise.allSettled —
 *      one feed failing must not deny the rest).
 *   4. Dedupe by id (FNV-1a of bank + datetime + title).
 *   5. Filter to the last 14 days, sort by datetime desc.
 *   6. Cache + return. Empty list on full failure — never fabricated.
 */

import { cacheGet, cacheSet } from "@/lib/market/cache";
import { isDemoMode } from "@/lib/api/demo";
import { fetchCBFeed } from "./adapters/rss";
import { CB_SPECS, ALL_BANKS } from "./feeds";
import type { CBEvent, CBName, CBSpec } from "./types";

const CACHE_TTL_SECONDS = 300; // 5 min
const CACHE_KEY = "cb::default-set";
const WINDOW_DAYS = 14;
const MAX_EVENTS = 60;

interface PerFeedStatus {
  bank: CBName;
  url: string;
  ok: boolean;
  count: number;
  error: string | null;
}

interface DiagState {
  last_fetched_at: string | null;
  per_feed: PerFeedStatus[];
  total_collected: number;
  total_in_window: number;
}

const DIAG: DiagState = {
  last_fetched_at: null,
  per_feed: [],
  total_collected: 0,
  total_in_window: 0,
};

function cbLog(event: string, detail: Record<string, unknown> = {}): void {
  // eslint-disable-next-line no-console
  console.log(`[cb] ${event}`, detail);
}

export async function getCBEvents(): Promise<CBEvent[]> {
  if (isDemoMode()) {
    cbLog("skipped:demo-mode");
    return [];
  }

  const cached = cacheGet<CBEvent[]>(CACHE_KEY);
  if (cached) {
    cbLog("cache-hit", { count: cached.length });
    return cached;
  }

  // Build a flat list of (spec, feedUrl) so we can fetch every feed in
  // parallel — not just one feed per bank.
  type FeedJob = { spec: CBSpec; url: string };
  const jobs: FeedJob[] = [];
  for (const bank of ALL_BANKS) {
    const spec = CB_SPECS[bank];
    for (const f of spec.feeds) jobs.push({ spec, url: f.url });
  }

  cbLog("fetching", { feeds: jobs.length, banks: ALL_BANKS.length });
  const tStart = Date.now();
  const results = await Promise.allSettled(jobs.map((j) => fetchCBFeed(j.spec, j.url)));
  const all: CBEvent[] = [];
  const perFeed: PerFeedStatus[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const r = results[i];
    if (r.status === "fulfilled") {
      all.push(...r.value);
      perFeed.push({ bank: job.spec.bank, url: job.url, ok: true, count: r.value.length, error: null });
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      perFeed.push({ bank: job.spec.bank, url: job.url, ok: false, count: 0, error: msg });
    }
  }

  // Dedupe by id.
  const seen = new Set<string>();
  const deduped: CBEvent[] = [];
  for (const e of all) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    deduped.push(e);
  }

  // 14-day window + chronological sort (newest first).
  const cutoff = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const filtered = deduped.filter((e) => {
    const ts = Date.parse(e.datetime);
    return Number.isFinite(ts) && ts >= cutoff;
  });
  filtered.sort((a, b) => b.datetime.localeCompare(a.datetime));

  const final = filtered.slice(0, MAX_EVENTS);

  cacheSet(CACHE_KEY, final, CACHE_TTL_SECONDS);

  DIAG.last_fetched_at = new Date().toISOString();
  DIAG.per_feed = perFeed;
  DIAG.total_collected = all.length;
  DIAG.total_in_window = final.length;

  cbLog("fetched", {
    took_ms: Date.now() - tStart,
    per_feed: perFeed.map((p) => ({ bank: p.bank, ok: p.ok, count: p.count, error: p.error })),
    total_collected: all.length,
    after_dedupe: deduped.length,
    in_window: final.length,
  });

  return final;
}

export function cbDiagnostics(): DiagState {
  return {
    last_fetched_at: DIAG.last_fetched_at,
    per_feed: [...DIAG.per_feed],
    total_collected: DIAG.total_collected,
    total_in_window: DIAG.total_in_window,
  };
}

/** Convenience: the events shown in the morning briefing — top N most recent. */
export async function getBriefingCBEvents(limit = 8): Promise<CBEvent[]> {
  const all = await getCBEvents();
  return all.slice(0, limit);
}
