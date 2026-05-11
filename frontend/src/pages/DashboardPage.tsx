import { CommandBar } from "../components/layout/CommandBar";
import { RegimeWidget } from "../components/ui/RegimeWidget";
import { RiskPill, StatusPill } from "../components/ui/StatusPill";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { BriefingHero } from "../components/briefing/BriefingHero";
import { BriefingRegimeSnapshot } from "../components/briefing/BriefingRegimeSnapshot";
import { FxMajorsPanel } from "../components/briefing/FxMajorsPanel";
import { RatesCurvePanel } from "../components/briefing/RatesCurvePanel";
import { KeyEventsPanel } from "../components/briefing/KeyEventsPanel";
import { ThemesPanel } from "../components/briefing/ThemesPanel";
import { BriefingMetadata } from "../components/briefing/BriefingMetadata";
import { Kbd } from "../components/ui/Kbd";
import { useGenerateBriefing, useLatestBriefing } from "../lib/hooks/useBriefings";
import { ApiError } from "../lib/api/client";

export function DashboardPage() {
  const { data: briefing, isPending, error, refetch } = useLatestBriefing();
  const generate = useGenerateBriefing();

  const handleGenerate = () => {
    generate.mutate({ overwrite: true, publish: true });
  };

  return (
    <>
      <CommandBar
        crumbs={[
          { label: "Desk" },
          { label: "Morning Briefing" },
        ]}
        leftExtras={
          briefing ? (
            <div style={{ display: "flex", gap: 6 }}>
              <StatusPill kind={briefing.status} />
              <RiskPill tone={briefing.risk_tone} />
            </div>
          ) : null
        }
        rightActions={
          <>
            {briefing ? (
              <RegimeWidget tone={briefing.risk_tone} seed={briefing.briefing_date} intensity="4.2σ" />
            ) : null}
            <span className="divider-v" style={{ height: 18 }} />
            <button
              type="button"
              className="btn"
              onClick={handleGenerate}
              disabled={generate.isPending}
            >
              <Kbd>G</Kbd>
              <Kbd>N</Kbd>
              &nbsp;{generate.isPending ? "Generating…" : "Generate"}
            </button>
            <button type="button" className="btn btn-primary">Publish · ⌘P</button>
          </>
        }
      />

      <div className="workspace">
        {isPending ? (
          <div className="col-span-12">
            <LoadingState label="Loading latest briefing…" />
          </div>
        ) : error instanceof ApiError && error.status === 404 ? (
          <div className="col-span-12">
            <EmptyState
              title="No briefing has been published yet."
              message="Generate your first Morning FX & Macro briefing — the desk will see the editorial headline here and the full briefing in the archive."
              action={
                <button type="button" className="btn btn-primary btn-lg" onClick={handleGenerate} disabled={generate.isPending}>
                  {generate.isPending ? "Generating…" : "Generate first briefing"}
                </button>
              }
            />
          </div>
        ) : error ? (
          <div className="col-span-12">
            <ErrorState
              title="Could not load briefing"
              message={error instanceof Error ? error.message : "Unknown error"}
              detail="Check the API server is running on http://127.0.0.1:8000"
              onRetry={() => refetch()}
            />
          </div>
        ) : briefing ? (
          <>
            <div className="col-span-8">
              <BriefingHero briefing={briefing} />
            </div>
            <div className="col-span-4">
              <BriefingRegimeSnapshot briefing={briefing} />
            </div>

            <div className="col-span-7">
              <FxMajorsPanel briefing={briefing} />
            </div>
            <div className="col-span-5">
              <RatesCurvePanel briefing={briefing} />
            </div>

            <div className="col-span-8">
              <KeyEventsPanel briefing={briefing} />
            </div>
            <div className="col-span-4">
              <ThemesPanel briefing={briefing} />
            </div>

            <div className="col-span-12">
              <BriefingMetadata briefing={briefing} />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
