import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { briefingsApi, type GenerateBriefingRequest } from "../api/briefings";
import { ApiError } from "../api/client";
import type { BriefingType } from "../types/briefing";

const STALE_30s = 30_000;

export const useLatestBriefing = (briefingType?: BriefingType) =>
  useQuery({
    queryKey: ["briefing", "latest", briefingType ?? "morning_fx_macro"],
    queryFn: () => briefingsApi.latest(briefingType),
    staleTime: STALE_30s,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 1;
    },
  });

export const useBriefingByDate = (date: string | undefined, briefingType?: BriefingType) =>
  useQuery({
    queryKey: ["briefing", "by-date", date, briefingType ?? "morning_fx_macro"],
    queryFn: () => briefingsApi.byDate(date as string, briefingType),
    enabled: !!date,
    staleTime: STALE_30s,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return failureCount < 1;
    },
  });

export const useRecentBriefings = (limit = 50, briefingType?: BriefingType) =>
  useQuery({
    queryKey: ["briefings", "recent", limit, briefingType ?? "all"],
    queryFn: () => briefingsApi.recent(limit, briefingType),
    staleTime: STALE_30s,
  });

export const useGenerateBriefing = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: GenerateBriefingRequest) => briefingsApi.generate(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["briefing"] });
      qc.invalidateQueries({ queryKey: ["briefings"] });
    },
  });
};
