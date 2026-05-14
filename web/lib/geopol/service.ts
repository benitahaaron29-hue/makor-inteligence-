/**
 * Geopolitical / government event service.
 *
 * Flow per call:
 *   1. Demo-mode guard: return [] when DEMO_MODE is on.
 *   2. Cache hit: return cached list (15-min TTL, same cadence as CB).
 *   3. Fetch every configured source feed in parallel (Promise.allSettled —
 *      one feed failing must not deny the rest).
 *   4. Dedupe by id (FNV-1a of org + datetime + title).
 *   5. Filter to the last 14 days, sort by datetime desc.
 *   6. Cache + return. Empty list on full failure — never fabricated.
 *
 * The default-set fetch returns ALL classified events (high + medium +
 * low) so /api/diag and the operator surface can see total coverage.
 * The briefing-context filter (`meetsBriefingFilter`) is applied at the
 * narrative-context build step, not here — keep the service layer
 * source-faithful and let downstream consumers filter for their use.
 */

import { cacheGet, cacheSet } from "@/lib/market/cache";
import { isDemoMode } from "@/lib/api/demo";
import { fetchGeoFeed } from "./adapters/rss";
import { meetsBriefingFilter } from "./classifier";
import { GEO_SOURCES } from "./feeds";
import type { GeoEvent } from "./types";

// 15-min TTL — government RSS feeds update slowly (typically once per
// hour at peak news flow; many far slower). The narrative endpoint reads
// the same cache so a cache-hit on the shell render means zero extra
// latency on the hydration call.
const CACHE_TTL_SECONDS = 900;
const CACHE_KEY = "geo::default-set";
// Editorial recency cap (Stab-4 editorial phase): an institutional
// overnight brief reads the last few days, not a fortnight. Items older
// than this don't belong in the morning desk note even if the upstream
// feed still carries them. 5d covers Friday-night-to-Monday-morning
// without dragging stale archival items into the report.
const WINDOW_DAYS = 5;
const MAX_EVENTS = 80;

interface PerFeedStatus {
  org: string;
  source: string;
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
  /** Counts after classification, by kind — quick "what flow is in scope today". */
  kind_counts: Record<string, number>;
}

const DIAG: DiagState = {
  last_fetched_at: null,
  per_feed: [],
  total_collected: 0,
  total_in_window: 0,
  kind_counts: {},
};

function geoLog(event: string, detail: Record<string, unknown> = {}): void {
  // eslint-disable-next-line no-console
  console.log(`[geo] ${event}`, detail);
}

export async function getGeoEvents(): Promise<GeoEvent[]> {
  if (isDemoMode()) {
    geoLog("skipped:demo-mode");
    return [];
  }

  const cached = cacheGet<GeoEvent[]>(CACHE_KEY);
  if (cached) {
    geoLog("cache-hit", { count: cached.length });
    return cached;
  }

  geoLog("fetching", { sources: GEO_SOURCES.length });
  const tStart = Date.now();
  const results = await Promise.allSettled(GEO_SOURCES.map((s) => fetchGeoFeed(s)));

  const all: GeoEvent[] = [];
  const perFeed: PerFeedStatus[] = [];
  for (let i = 0; i < GEO_SOURCES.length; i++) {
    const spec = GEO_SOURCES[i];
    const r = results[i];
    if (r.status === "fulfilled") {
      all.push(...r.value);
      perFeed.push({
        org: spec.org,
        source: spec.source,
        url: spec.feed_url,
        ok: true,
        count: r.value.length,
        error: null,
      });
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      perFeed.push({
        org: spec.org,
        source: spec.source,
        url: spec.feed_url,
        ok: false,
        count: 0,
        error: msg,
      });
    }
  }

  // Dedupe by id.
  const seen = new Set<string>();
  const deduped: GeoEvent[] = [];
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
  const kindCounts: Record<string, number> = {};
  for (const e of final) kindCounts[e.kind] = (kindCounts[e.kind] ?? 0) + 1;

  cacheSet(CACHE_KEY, final, CACHE_TTL_SECONDS);

  DIAG.last_fetched_at = new Date().toISOString();
  DIAG.per_feed = perFeed;
  DIAG.total_collected = all.length;
  DIAG.total_in_window = final.length;
  DIAG.kind_counts = kindCounts;

  geoLog("fetched", {
    took_ms: Date.now() - tStart,
    per_feed: perFeed.map((p) => ({ org: p.org, ok: p.ok, count: p.count, error: p.error })),
    total_collected: all.length,
    after_dedupe: deduped.length,
    in_window: final.length,
    kinds: kindCounts,
  });

  return final;
}

export function geoDiagnostics(): DiagState {
  return {
    last_fetched_at: DIAG.last_fetched_at,
    per_feed: [...DIAG.per_feed],
    total_collected: DIAG.total_collected,
    total_in_window: DIAG.total_in_window,
    kind_counts: { ...DIAG.kind_counts },
  };
}

/**
 * Top-N briefing-relevant events for the morning brief.
 *
 * Applies `meetsBriefingFilter` BEFORE slicing so a recent flood of
 * low-relevance press releases (typical from supranational feeds) can't
 * crowd out an older but high-relevance sanctions or fiscal announcement.
 * The full pool is still available via `getGeoEvents()` for diagnostics
 * and Phase 3.3's UI work.
 */
export async function getBriefingGeoEvents(limit = 12): Promise<GeoEvent[]> {
  const all = await getGeoEvents();
  return all.filter(meetsBriefingFilter).slice(0, limit);
}
