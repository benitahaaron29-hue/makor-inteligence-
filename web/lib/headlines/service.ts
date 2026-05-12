/**
 * Headlines service — orchestration layer.
 *
 * Flow per call:
 *   1. Demo-mode guard: return [] when DEMO_MODE is on.
 *   2. Cache hit: return cached list if fresh (3 min TTL).
 *   3. Fetch all configured feeds in parallel (Promise.allSettled — one
 *      adapter failing must not deny the whole list).
 *   4. Dedupe by id (FNV-1a of source + normalised title).
 *   5. Classify each headline (category + relevance + market_impact).
 *   6. Drop "filtered" relevance.
 *   7. Keep last 24h, sort by published_at desc, cap at 40.
 *   8. Cache + return. Empty list on full failure — never fabricated.
 *
 * Source set is intentionally small and conservative. We start with the
 * two public RSS feeds that are reliable in production and add more
 * adapters as the source list grows.
 */

import { cacheGet, cacheSet } from "@/lib/market/cache";
import { isDemoMode } from "@/lib/api/demo";
import { fetchFeed, type FeedSpec } from "./adapters/rss";
import { classifyHeadline, meetsBriefingFilter } from "./classifier";
import type { Headline } from "./types";

const CACHE_TTL_SECONDS = 180;
const CACHE_KEY = "headlines::default-set";
const WINDOW_HOURS = 24;
const MAX_HEADLINES = 40;

/**
 * Feed registry. Each entry is one public RSS/Atom URL plus its display
 * source label. The registry is the only place adapter URLs live; the
 * service iterates this list and a failed feed simply contributes
 * nothing to the day's headlines (the diagnostic block surfaces which
 * adapter failed and why).
 *
 * URLs chosen for reliability — public, well-formed RSS, no auth. Users
 * can extend via custom adapter additions; service code does not change.
 */
const FEEDS: FeedSpec[] = [
  { source: "BBC Business", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
  { source: "BBC World",    url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { source: "AP Top",       url: "https://feeds.apnews.com/rss/apf-topnews" },
  { source: "AP World",     url: "https://feeds.apnews.com/rss/apf-intlnews" },
  { source: "AP Business",  url: "https://feeds.apnews.com/rss/apf-business" },
];

interface DiagState {
  last_fetched_at: string | null;
  per_feed: Array<{ source: string; url: string; ok: boolean; count: number; error: string | null }>;
  total_collected: number;
  total_published: number;
}

const DIAG: DiagState = {
  last_fetched_at: null,
  per_feed: [],
  total_collected: 0,
  total_published: 0,
};

export async function getHeadlines(): Promise<Headline[]> {
  if (isDemoMode()) return [];

  const cached = cacheGet<Headline[]>(CACHE_KEY);
  if (cached) return cached;

  const results = await Promise.allSettled(FEEDS.map((f) => fetchFeed(f)));

  const all: Headline[] = [];
  const perFeed: DiagState["per_feed"] = [];

  for (let i = 0; i < FEEDS.length; i++) {
    const spec = FEEDS[i];
    const r = results[i];
    if (r.status === "fulfilled") {
      all.push(...r.value);
      perFeed.push({ source: spec.source, url: spec.url, ok: true, count: r.value.length, error: null });
    } else {
      const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
      perFeed.push({ source: spec.source, url: spec.url, ok: false, count: 0, error: msg });
    }
  }

  // Dedupe by id — same headline from two sources collapses to the
  // first-seen entry (Promise.allSettled preserves FEEDS order).
  const seen = new Set<string>();
  const deduped: Headline[] = [];
  for (const h of all) {
    if (seen.has(h.id)) continue;
    seen.add(h.id);
    deduped.push(h);
  }

  // Classify + drop "filtered" relevance + 24h window.
  const cutoff = Date.now() - WINDOW_HOURS * 60 * 60 * 1000;
  const classified: Headline[] = [];
  for (const h of deduped) {
    const c = classifyHeadline(h.title);
    if (c.relevance === "filtered") continue;
    const ts = Date.parse(h.published_at);
    if (!Number.isFinite(ts) || ts < cutoff) continue;
    classified.push({
      ...h,
      category: c.category,
      relevance: c.relevance,
      market_impact: c.market_impact,
    });
  }

  // Sort newest first, cap.
  classified.sort((a, b) => b.published_at.localeCompare(a.published_at));
  const final = classified.slice(0, MAX_HEADLINES);

  cacheSet(CACHE_KEY, final, CACHE_TTL_SECONDS);

  DIAG.last_fetched_at = new Date().toISOString();
  DIAG.per_feed = perFeed;
  DIAG.total_collected = all.length;
  DIAG.total_published = final.length;

  return final;
}

export function headlinesDiagnostics(): DiagState {
  return {
    last_fetched_at: DIAG.last_fetched_at,
    per_feed: [...DIAG.per_feed],
    total_collected: DIAG.total_collected,
    total_published: DIAG.total_published,
  };
}

/** Convenience: the subset shown in the morning briefing by default. */
export async function getBriefingHeadlines(limit = 10): Promise<Headline[]> {
  const all = await getHeadlines();
  return all.filter(meetsBriefingFilter).slice(0, limit);
}
