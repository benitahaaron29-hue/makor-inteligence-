import Link from "next/link";
import { ChevronLeft, ChevronRight, Mail } from "lucide-react";
import { notFound } from "next/navigation";

import { CommandBar } from "@/components/layout/command-bar";
import { OperationsBar } from "@/components/layout/operations-bar";
import { GenerateButton } from "@/components/layout/generate-button";
import { PrintButton } from "@/components/layout/print-button";
import { ShareActions } from "@/components/layout/share-actions";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { ErrorState } from "@/components/ui/states";
import { NarrativeHydrator } from "@/components/briefing/narrative-hydrator";

import { briefingsApi } from "@/lib/api/briefings";
import { sourcesApi, type SourceView } from "@/lib/api/sources";
import type { BriefingRead } from "@/lib/types/briefing";

export const dynamic = "force-dynamic";
// The page route now resolves to the *shell* briefing (live market /
// calendar / headlines / CB activity assembled with template content in
// narrative-driven slots). The LLM call lives in /api/narrative and is
// fired by the client hydrator after first paint, so this route's
// budget rarely needs more than a few seconds. 60s is kept as a safety
// margin for cold-cache RSS / TradingEconomics fetches.
export const maxDuration = 60;

interface BriefingDetailPageProps {
  params: { date: string };
}

export default async function BriefingDetailPage({ params }: BriefingDetailPageProps) {
  const { date } = params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  let briefing: BriefingRead | null = null;
  let sources: SourceView[] = [];
  let fetchError: string | null = null;

  try {
    const [b, s] = await Promise.all([
      briefingsApi.byDate(date),
      sourcesApi.list().catch(() => [] as SourceView[]),
    ]);
    briefing = b;
    sources = s;
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Unknown error";
  }

  if (briefing === null && !fetchError) {
    notFound();
  }

  const sourceHealth = summarizeSourceHealth(sources);

  return (
    <>
      <CommandBar
        crumbs={[
          { label: "Archive", to: "/archive" },
          { label: date },
        ]}
        rightActions={
          <>
            <Button asChild size="sm">
              <Link href="/archive">
                <ChevronLeft size={12} aria-hidden style={{ marginRight: 4 }} />
                <Kbd>←</Kbd>
                <span style={{ marginLeft: 4 }}>Prev</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/archive">
                <span style={{ marginRight: 4 }}>Next</span>
                <Kbd>→</Kbd>
                <ChevronRight size={12} aria-hidden style={{ marginLeft: 4 }} />
              </Link>
            </Button>
            <span className="divider-v" style={{ height: 18 }} />
            <Button asChild variant="primary" size="sm">
              <Link href="/">Terminal</Link>
            </Button>
          </>
        }
      />

      {briefing ? (
        <OperationsBar
          briefingDate={briefing.briefing_date}
          status={briefing.status}
          risk={briefing.risk_tone}
          generatedAt={briefing.published_at ?? briefing.created_at}
          sourceHealth={sourceHealth}
          regimeIntensity="archive"
          actions={
            <>
              <ShareActions
                briefingDate={briefing.briefing_date}
                briefingTitle={briefing.title}
              />
              <span className="divider-v" style={{ height: 16 }} />
              <PrintButton label="Print / PDF" />
              <Button size="sm">
                <Mail size={12} aria-hidden style={{ marginRight: 4 }} />
                Email desk
              </Button>
              <GenerateButton size="sm" variant="primary" label="Regenerate" />
            </>
          }
        />
      ) : null}

      {fetchError ? (
        <div className="workspace">
          <div className="col-span-12">
            <ErrorState
              title="Could not load briefing"
              message={fetchError}
              detail="The desk data service did not respond. Retry, or refresh the page."
            />
          </div>
        </div>
      ) : briefing ? (
        <NarrativeHydrator briefing={briefing} />
      ) : null}
    </>
  );
}

function summarizeSourceHealth(sources: SourceView[]) {
  let live = 0, pending = 0, degraded = 0, fallback = 0;
  for (const s of sources) {
    if (s.status === "live" || s.status === "mock") live++;
    else if (s.status === "degraded") degraded++;
    else if (s.status === "fallback") fallback++;
    else if (s.status === "phase_2") pending++;
  }
  return { live, pending, degraded, fallback, total: sources.length };
}
