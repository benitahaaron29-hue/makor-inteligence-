import { Panel, PanelBody, PanelHeader } from "../ui/Panel";
import { ImportancePill } from "../ui/StatusPill";
import { Kbd } from "../ui/Kbd";
import type { BriefingRead } from "../../lib/types/briefing";

interface KeyEventsPanelProps {
  briefing: BriefingRead;
  compact?: boolean;
}

export function KeyEventsPanel({ briefing, compact = false }: KeyEventsPanelProps) {
  const events = briefing.key_events ?? [];
  const high = events.filter((e) => e.importance.toLowerCase() === "high").length;

  return (
    <Panel>
      <PanelHeader
        eyebrow="Calendar · Today"
        title="Key Events"
        actions={
          <>
            {high > 0 ? (
              <span className="caption" style={{ color: "var(--alert)" }}>
                {high} high-impact
              </span>
            ) : null}
            <Kbd>C</Kbd>
            <Kbd>A</Kbd>
          </>
        }
      />
      <PanelBody density="flush">
        <table className={`data-table ${compact ? "data-table-compact" : ""}`}>
          <thead>
            <tr>
              <th>Time</th>
              <th>Region</th>
              <th>Event</th>
              <th className="col-center">Imp.</th>
              <th className="col-num">Forecast</th>
              <th className="col-num">Prev.</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 16, color: "var(--text-tertiary)" }}>
                  No scheduled events in this briefing.
                </td>
              </tr>
            ) : (
              events.map((e, i) => (
                <tr key={i}>
                  <td className="col-num">{e.time_utc}</td>
                  <td>{e.region}</td>
                  <td>{e.event}</td>
                  <td className="col-center">
                    <ImportancePill importance={e.importance} />
                  </td>
                  <td className="col-num">{e.forecast ?? "—"}</td>
                  <td className="col-num">{e.previous ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </PanelBody>
    </Panel>
  );
}
