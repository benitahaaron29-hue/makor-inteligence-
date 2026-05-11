import type { ReactNode } from "react";
import { Card, CardBody } from "./card";
import { LiveDot } from "./live-dot";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <Card>
      <CardBody density="premium">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
          <LiveDot />
          <span className="body-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
        </div>
      </CardBody>
    </Card>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  detail?: ReactNode;
  action?: ReactNode;
}

export function ErrorState({
  title = "Request failed",
  message,
  detail,
  action,
}: ErrorStateProps) {
  return (
    <Card highlight style={{ borderLeftColor: "var(--offer)" }}>
      <CardBody density="premium">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="eyebrow" style={{ color: "var(--offer)" }}>Error</span>
          <span className="heading-3">{title}</span>
          {message ? (
            <span className="body-sm" style={{ color: "var(--text-secondary)" }}>{message}</span>
          ) : null}
          {detail ? <span className="caption">{detail}</span> : null}
          {action}
        </div>
      </CardBody>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  message: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <Card variant="research" highlight>
      <CardBody density="editorial">
        <div className="masthead-rule" style={{ marginBottom: 20 }} />
        <span className="eyebrow">No briefing</span>
        <h2 className="editorial-h1" style={{ marginTop: 8, maxWidth: 640 }}>{title}</h2>
        <p className="editorial-dek" style={{ marginTop: 12, maxWidth: 640 }}>{message}</p>
        {action ? <div style={{ marginTop: 24 }}>{action}</div> : null}
      </CardBody>
    </Card>
  );
}
