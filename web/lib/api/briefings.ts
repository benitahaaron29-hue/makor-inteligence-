import { apiFetch, ApiError } from "./client";
import { loadMock, withMockFallback, isDemoMode } from "./demo";
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

const MOCK_LATEST = "latest-briefing.json";
const MOCK_RECENT = "recent-briefings.json";

async function mockLatest(): Promise<BriefingRead> {
  return loadMock<BriefingRead>(MOCK_LATEST);
}

async function mockByDate(date: string): Promise<BriefingRead> {
  const base = await loadMock<BriefingRead>(MOCK_LATEST);
  // Clone + override the date so the URL the viewer requested matches the
  // payload they receive (the demo always serves the same rich briefing
  // body — only the headline date changes).
  return {
    ...base,
    briefing_date: date,
    title: base.title.replace(/— .+ \d{4}/, `— ${formatDateForTitle(date)}`),
    published_at: base.published_at ?? `${date}T06:42:00Z`,
    created_at: base.created_at ?? `${date}T06:38:00Z`,
  };
}

function formatDateForTitle(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

async function mockRecent(limit: number): Promise<BriefingSummary[]> {
  const all = await loadMock<BriefingSummary[]>(MOCK_RECENT);
  return all.slice(0, limit);
}

export const briefingsApi = {
  /** Returns the latest published briefing, or null if none exists (404). */
  async latest(briefingType?: BriefingType): Promise<BriefingRead | null> {
    return withMockFallback<BriefingRead | null>(
      async () => {
        try {
          const path = briefingType
            ? `/briefings/latest?briefing_type=${briefingType}`
            : "/briefings/latest";
          return await apiFetch<BriefingRead>(path);
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }
      },
      async () => mockLatest(),
    );
  },

  /** Returns the briefing for `date`, or null if none exists (404). */
  async byDate(date: string, briefingType?: BriefingType): Promise<BriefingRead | null> {
    return withMockFallback<BriefingRead | null>(
      async () => {
        try {
          const path = briefingType
            ? `/briefings/by-date/${date}?briefing_type=${briefingType}`
            : `/briefings/by-date/${date}`;
          return await apiFetch<BriefingRead>(path);
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }
      },
      async () => mockByDate(date),
    );
  },

  recent(limit = 50, briefingType?: BriefingType): Promise<BriefingSummary[]> {
    return withMockFallback<BriefingSummary[]>(
      async () => {
        const params = new URLSearchParams();
        params.set("limit", String(limit));
        if (briefingType) params.set("briefing_type", briefingType);
        return apiFetch<BriefingSummary[]>(`/briefings?${params.toString()}`);
      },
      async () => mockRecent(limit),
    );
  },

  generate(req: GenerateBriefingRequest = {}): Promise<BriefingRead> {
    // In demo mode, "generate" is a no-op that simply returns the bundled
    // briefing — there is no backend to call. The UI gets a successful
    // response so the action feels live to the demo viewer.
    if (isDemoMode()) {
      return mockLatest();
    }
    return apiFetch<BriefingRead>("/briefings/generate", {
      method: "POST",
      body: JSON.stringify(req),
    });
  },
};
