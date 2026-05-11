import { Link, useParams } from "react-router-dom";
import { CommandBar } from "../components/layout/CommandBar";
import { ErrorState, LoadingState } from "../components/ui/States";
import { useBriefingByDate, useRecentBriefings } from "../lib/hooks/useBriefings";
import { ApiError } from "../lib/api/client";
import { Kbd } from "../components/ui/Kbd";
import { BriefingReader } from "../components/briefing/BriefingReader";

export function BriefingDetailPage() {
  const { date } = useParams<{ date: string }>();
  const { data: briefing, isPending, error, refetch } = useBriefingByDate(date);
  const { data: recent } = useRecentBriefings(8);

  const previous = (recent ?? [])
    .filter((b) => b.briefing_date !== date)
    .slice(0, 5);

  return (
    <>
      <CommandBar
        crumbs={[
          { label: "Desk", to: "/" },
          { label: "Morning Briefing", to: "/" },
          { label: date ?? "—" },
        ]}
        rightActions={
          <>
            <button type="button" className="btn"><Kbd>←</Kbd>&nbsp;Prev</button>
            <button type="button" className="btn">Next&nbsp;<Kbd>→</Kbd></button>
            <span className="divider-v" style={{ height: 18 }} />
            <button type="button" className="btn">Print</button>
            <button type="button" className="btn">Email desk</button>
            <Link to="/" className="btn btn-primary">Back to dashboard</Link>
          </>
        }
      />

      {isPending ? (
        <div className="workspace">
          <div className="col-span-12">
            <LoadingState label={`Loading briefing for ${date}…`} />
          </div>
        </div>
      ) : error instanceof ApiError && error.status === 404 ? (
        <div className="workspace">
          <div className="col-span-12">
            <ErrorState
              title={`No briefing found for ${date}`}
              message="The desk has not published a Morning FX & Macro briefing for this date."
              onRetry={() => refetch()}
            />
          </div>
        </div>
      ) : error ? (
        <div className="workspace">
          <div className="col-span-12">
            <ErrorState
              title="Could not load briefing"
              message={error instanceof Error ? error.message : "Unknown error"}
              onRetry={() => refetch()}
            />
          </div>
        </div>
      ) : briefing ? (
        <BriefingReader briefing={briefing} related={previous} />
      ) : null}
    </>
  );
}
