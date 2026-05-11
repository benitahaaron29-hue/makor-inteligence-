import { apiFetch } from "./client";

export type SourceStatus =
  | "live"
  | "degraded"
  | "fallback"
  | "mock"
  | "phase_2";

export type SourceCategory =
  | "news"
  | "calendar"
  | "market"
  | "desk"
  | "volatility"
  | "synthesis";

export interface SourceView {
  name: string;
  category: SourceCategory;
  integration: string;
  cadence: string;
  fallback: string | null;
  priority: number;
  critical_path: boolean;
  description: string;
  status: SourceStatus;
  last_success_at: string | null;
  last_error: string | null;
  reliability_score: number | null;
  records_last_run: number;
  // Phase-2 operational realism
  latency_ms: number | null;
  vendor: string | null;
  region: string | null;
}

export const sourcesApi = {
  list(): Promise<SourceView[]> {
    return apiFetch<SourceView[]>("/sources");
  },
};
