import { apiFetch, ApiError } from "./client";
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

export const briefingsApi = {
  /** Returns the latest published briefing, or null if none exists (404). */
  async latest(briefingType?: BriefingType): Promise<BriefingRead | null> {
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

  /** Returns the briefing for `date`, or null if none exists (404). */
  async byDate(date: string, briefingType?: BriefingType): Promise<BriefingRead | null> {
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

  recent(limit = 50, briefingType?: BriefingType): Promise<BriefingSummary[]> {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (briefingType) params.set("briefing_type", briefingType);
    return apiFetch<BriefingSummary[]>(`/briefings?${params.toString()}`);
  },

  generate(req: GenerateBriefingRequest = {}): Promise<BriefingRead> {
    return apiFetch<BriefingRead>("/briefings/generate", {
      method: "POST",
      body: JSON.stringify(req),
    });
  },
};
