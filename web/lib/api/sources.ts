import { apiFetch } from "./client";
import { withMockFallback, loadMock } from "./demo";

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

const MOCK_SOURCES = "sources.json";

export const sourcesApi = {
  list(): Promise<SourceView[]> {
    return withMockFallback<SourceView[]>(
      () => apiFetch<SourceView[]>("/sources"),
      () => loadMock<SourceView[]>(MOCK_SOURCES),
    );
  },
};
