import { CommandBar } from "@/components/layout/command-bar";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

type Status = "ok" | "pending" | "failed";

interface Row {
  label: string;
  value: string;
  status?: Status;
  hint?: string;
}

interface Group {
  eyebrow: string;
  title: string;
  rows: Row[];
}

export default async function SettingsPage() {
  const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://127.0.0.1:8000";
  const env = process.env.NODE_ENV ?? "development";

  let apiHealth: Status = "pending";
  try {
    const res = await fetch(`${apiOrigin}/api/v1/health`, { cache: "no-store" });
    apiHealth = res.ok ? "ok" : "failed";
  } catch {
    apiHealth = "failed";
  }

  const groups: Group[] = [
    {
      eyebrow: "Application",
      title: "Platform Configuration",
      rows: [
        { label: "Product",     value: "Makor Intelligence Platform" },
        { label: "Surface",     value: "Next.js 14 · React 18 · TypeScript" },
        { label: "Frontend",    value: "127.0.0.1:3000", hint: "Dev server" },
        { label: "Environment", value: env },
        { label: "Build",       value: "Phase 1.0 · Mock generator wired" },
      ],
    },
    {
      eyebrow: "Backend",
      title: "FastAPI Service",
      rows: [
        { label: "Origin",  value: apiOrigin, hint: "NEXT_PUBLIC_API_ORIGIN" },
        { label: "Health",  value: apiHealth === "ok" ? "Reachable" : "Unreachable", status: apiHealth },
        { label: "Database",value: "PostgreSQL via async SQLAlchemy", hint: "SQLite for local boot" },
        { label: "API root",value: "/api/v1" },
      ],
    },
    {
      eyebrow: "Briefing",
      title: "Generation Preferences",
      rows: [
        { label: "Desk timezone", value: "Europe/London" },
        { label: "Briefing time", value: "06:30 UTC daily", hint: "07:00 UTC SLA" },
        { label: "Default type",  value: "morning_fx_macro" },
        { label: "Author",        value: "A. Benitah · Strategy" },
        { label: "Distribution",  value: "Makor Macro & FX Desk" },
      ],
    },
    {
      eyebrow: "AI Synthesis",
      title: "Generator",
      rows: [
        { label: "Current",  value: "Mock generator (mock-v1)", status: "ok" },
        { label: "Phase 2",  value: "Anthropic Claude · prompt-cached", status: "pending" },
        { label: "Model ID", value: "claude-opus-4-7", hint: "Configured · awaits API key" },
        { label: "Sections", value: "9 · summary → key risks" },
      ],
    },
    {
      eyebrow: "Interface",
      title: "Display",
      rows: [
        { label: "Theme",        value: "Terminal · navy", hint: "Single theme · locked" },
        { label: "Density",      value: "Institutional (13px base · tabular numerics)" },
        { label: "Typography",   value: "Inter · JetBrains Mono · Source Serif 4" },
        { label: "Min width",    value: "1280 px", hint: "Desktop-only by design" },
      ],
    },
  ];

  return (
    <>
      <CommandBar
        crumbs={[{ label: "Settings" }]}
        leftExtras={
          <span className="caption" style={{ color: "var(--text-tertiary)" }}>
            Read-only in Phase 1 · Editable preferences land in Phase 2
          </span>
        }
      />

      <div className="workspace">
        {groups.map((g) => (
          <div key={g.title} className="col-span-6">
            <SettingsGroup group={g} />
          </div>
        ))}
      </div>
    </>
  );
}

function SettingsGroup({ group }: { group: Group }) {
  return (
    <Card>
      <CardHeader eyebrow={group.eyebrow} title={group.title} />
      <CardBody density="premium">
        <div className="sidebar-session" style={{ gridTemplateColumns: "144px 1fr" }}>
          {group.rows.map((r) => (
            <RowDisplay key={r.label} row={r} />
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function RowDisplay({ row }: { row: Row }) {
  return (
    <>
      <span className="sidebar-session-key">{row.label}</span>
      <span className="sidebar-session-value" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ color: "var(--text-primary)" }}>{row.value}</span>
        {row.status ? <StatusBadge status={row.status} /> : null}
        {row.hint ? (
          <span className="caption" style={{ color: "var(--text-tertiary)" }}>
            {row.hint}
          </span>
        ) : null}
      </span>
    </>
  );
}

function StatusBadge({ status }: { status: Status }) {
  if (status === "ok") return <Badge variant="published">Live</Badge>;
  if (status === "pending") return <Badge variant="draft">Phase 2</Badge>;
  return <Badge variant="failed">Down</Badge>;
}
