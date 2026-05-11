import { apiFetch } from "./client";
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
  latest: (briefingType?: BriefingType) =>
    apiFetch<BriefingRead>(
      briefingType ? `/briefings/latest?briefing_type=${briefingType}` : "/briefings/latest",
    ),

  byDate: (date: string, briefingType?: BriefingType) =>
    apiFetch<BriefingRead>(
      briefingType
        ? `/briefings/by-date/${date}?briefing_type=${briefingType}`
        : `/briefings/by-date/${date}`,
    ),

  recent: (limit = 50, briefingType?: BriefingType) => {
    const params = new URLSearchParams();
    params.set("limit", String(limit));
    if (briefingType) params.set("briefing_type", briefingType);
    return apiFetch<BriefingSummary[]>(`/briefings?${params.toString()}`);
  },

  generate: (req: GenerateBriefingRequest = {}) =>
    apiFetch<BriefingRead>("/briefings/generate", {
      method: "POST",
      body: JSON.stringify(req),
    }),
};
