import { apiFetch, ApiError } from "./client";
import { loadMock, withMockFallback, isDemoMode } from "./demo";
import { generateBriefing } from "@/lib/briefing/generator";
import type {
  BriefingRead,
  BriefingSummary,
  BriefingType,
} from "../types/briefing";

export interface GenerateBriefingRequest {
  briefing_date?: string;
  briefing_type?: BriefingType;
  publish?: boolean;
  overwrite?: boolean;
}

// ===========================================================================
// MODE RESOLUTION
//
// The platform supports three deployment modes:
//
//   1. Demo mode — DEMO_MODE / NEXT_PUBLIC_DEMO_MODE === "true".
//      Serves the bundled mock briefing with a clear disclosure banner.
//      Never calls the upstream backend, never fetches live market data.
//
//   2. Backend mode — NEXT_PUBLIC_API_ORIGIN points at a real HTTPS host
//      (anything that isn't localhost / 127.* / 0.0.0.0). The frontend
//      delegates to that backend, which is expected to ship its own
//      generator + intelligence layer.
//
//   3. Vercel-native mode — DEMO_MODE off AND no real backend configured.
//      The frontend generates the briefing on-demand using the live
//      market-data service (Yahoo Finance for now) + a neutral
//      institutional narrative template. This is the current Vercel
//      deployment story until the Python backend is hosted somewhere.
//
// The three modes are mutually exclusive and resolved per-call.
// ===========================================================================

function hasRealBackend(): boolean {
  const origin = (process.env.NEXT_PUBLIC_API_ORIGIN ?? "").trim();
  if (!origin) return false;
  // Treat anything bound to the dev machine as "no backend deployed".
  return /^https?:\/\/(?!localhost|127\.|0\.0\.0\.0|\[::1\])/i.test(origin);
}

function todayIsoUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  return `${d} ${months[m - 1]} ${y}`;
}

function lastNBusinessDays(n: number): string[] {
  const out: string[] = [];
  const cursor = new Date();
  while (out.length < n) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      out.push(cursor.toISOString().slice(0, 10));
    }
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return out;
}

function autoSummary(date: string): BriefingSummary {
  return {
    id: `auto-${date}`,
    briefing_date: date,
    briefing_type: "morning_fx_macro",
    status: "published",
    title: `Morning FX & Macro Review — ${formatLongDate(date)}`,
    headline:
      "Live market reference · institutional template until strategist input is wired",
    risk_tone: "neutral",
    published_at: `${date}T06:00:00Z`,
    created_at: `${date}T06:00:00Z`,
  };
}

// ===========================================================================
// DEMO-MODE MOCK HELPERS — bundled JSON (used only in demo mode).
// ===========================================================================

const MOCK_LATEST = "latest-briefing.json";
const MOCK_RECENT = "recent-briefings.json";

async function mockLatest(): Promise<BriefingRead> {
  return loadMock<BriefingRead>(MOCK_LATEST);
}

async function mockByDate(date: string): Promise<BriefingRead> {
  const base = await loadMock<BriefingRead>(MOCK_LATEST);
  return {
    ...base,
    briefing_date: date,
    title: base.title.replace(/— .+ \d{4}/, `— ${formatLongDate(date)}`),
    published_at: base.published_at ?? `${date}T06:42:00Z`,
    created_at: base.created_at ?? `${date}T06:38:00Z`,
  };
}

async function mockRecent(limit: number): Promise<BriefingSummary[]> {
  const all = await loadMock<BriefingSummary[]>(MOCK_RECENT);
  return all.slice(0, limit);
}

// ===========================================================================
// PUBLIC API
// ===========================================================================

export const briefingsApi = {
  /**
   * Latest briefing. Mode-resolved:
   *   demo     → bundled mock
   *   backend  → upstream /api/v1/briefings/latest
   *   vercel   → generateBriefing(todayIsoUtc())
   */
  async latest(briefingType?: BriefingType): Promise<BriefingRead | null> {
    return withMockFallback<BriefingRead | null>(
      async () => {
        if (hasRealBackend()) {
          try {
            const path = briefingType
              ? `/briefings/latest?briefing_type=${briefingType}`
              : "/briefings/latest";
            return await apiFetch<BriefingRead>(path);
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) return null;
            // Any other error from the configured backend: fall through to
            // the Vercel-native generator rather than show an error state.
            // The generator still respects "never fabricate" — its market
            // values come from getQuote() and read "data unavailable"
            // when the upstream feeds are down.
          }
        }
        return generateBriefing(todayIsoUtc());
      },
      async () => mockLatest(),
    );
  },

  /**
   * Briefing for a specific date. Same mode resolution as `latest`.
   * In Vercel-native mode, the generator produces today-shaped content
   * with the requested date in the header; the briefing's
   * `demo_disclosure` makes the data-currentness explicit.
   */
  async byDate(date: string, briefingType?: BriefingType): Promise<BriefingRead | null> {
    return withMockFallback<BriefingRead | null>(
      async () => {
        if (hasRealBackend()) {
          try {
            const path = briefingType
              ? `/briefings/by-date/${date}?briefing_type=${briefingType}`
              : `/briefings/by-date/${date}`;
            return await apiFetch<BriefingRead>(path);
          } catch (err) {
            if (err instanceof ApiError && err.status === 404) return null;
            // Fall through to the generator (see comment in `latest`).
          }
        }
        return generateBriefing(date);
      },
      async () => mockByDate(date),
    );
  },

  /**
   * Archive list. In Vercel-native mode this returns the last `limit`
   * business days with generic auto-generated summaries; each entry
   * resolves via `byDate` when the viewer drills into it.
   */
  recent(limit = 50, briefingType?: BriefingType): Promise<BriefingSummary[]> {
    return withMockFallback<BriefingSummary[]>(
      async () => {
        if (hasRealBackend()) {
          const params = new URLSearchParams();
          params.set("limit", String(limit));
          if (briefingType) params.set("briefing_type", briefingType);
          return apiFetch<BriefingSummary[]>(`/briefings?${params.toString()}`);
        }
        const cap = Math.max(1, Math.min(limit, 10));
        return lastNBusinessDays(cap).map(autoSummary);
      },
      async () => mockRecent(limit),
    );
  },

  /**
   * "Generate now" action — in Vercel-native mode this just regenerates
   * the briefing for the requested date (or today). There is no
   * persistent store on Vercel; the action exists so the Generate button
   * in the UI has a sensible no-op rather than throwing.
   */
  generate(req: GenerateBriefingRequest = {}): Promise<BriefingRead> {
    if (isDemoMode()) {
      return mockLatest();
    }
    if (hasRealBackend()) {
      return apiFetch<BriefingRead>("/briefings/generate", {
        method: "POST",
        body: JSON.stringify(req),
      });
    }
    return generateBriefing(req.briefing_date ?? todayIsoUtc());
  },
};
