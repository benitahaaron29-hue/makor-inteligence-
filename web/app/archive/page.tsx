import { CommandBar } from "@/components/layout/command-bar";
import { GenerateButton } from "@/components/layout/generate-button";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/states";
import { ArchiveTable } from "@/components/panels/archive-table";
import { briefingsApi } from "@/lib/api/briefings";
import type { BriefingSummary } from "@/lib/types/briefing";
import { Download } from "lucide-react";

export const dynamic = "force-dynamic";

interface ArchivePageProps {
  searchParams: { q?: string };
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  let briefings: BriefingSummary[] = [];
  let fetchError: string | null = null;
  try {
    briefings = await briefingsApi.recent(200);
  } catch (err) {
    fetchError = err instanceof Error ? err.message : "Unknown error";
  }

  const earliest = briefings.length ? briefings[briefings.length - 1]?.briefing_date : null;
  const latest = briefings.length ? briefings[0]?.briefing_date : null;
  const rangeLabel =
    earliest && latest
      ? `${earliest} → ${latest}`
      : briefings.length === 0
        ? "no records yet"
        : "—";

  return (
    <>
      <CommandBar
        crumbs={[
          { label: "Research" },
          { label: "Briefing Archive" },
        ]}
        leftExtras={
          <span className="caption">
            {briefings.length} records · {rangeLabel}
          </span>
        }
        rightActions={
          <>
            <Button>
              <Download size={12} aria-hidden style={{ marginRight: 4 }} />
              CSV
            </Button>
            <Button>
              <Download size={12} aria-hidden style={{ marginRight: 4 }} />
              PDF
            </Button>
            <GenerateButton variant="primary" label="+ New Briefing" />
          </>
        }
      />

      <div className="workspace">
        {fetchError ? (
          <div className="col-span-12">
            <ErrorState
              title="Could not load archive"
              message={fetchError}
              detail="Check the FastAPI backend is running on http://127.0.0.1:8000"
            />
          </div>
        ) : (
          <div className="col-span-12">
            <ArchiveTable briefings={briefings} initialQuery={searchParams.q ?? ""} />
          </div>
        )}
      </div>
    </>
  );
}
