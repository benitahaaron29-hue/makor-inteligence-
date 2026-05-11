import type { ReactNode } from "react";
import { Panel, PanelBody } from "./Panel";

interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label = "Loading…" }: LoadingStateProps) {
  return (
    <Panel>
      <PanelBody density="premium">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
          <span className="live-dot" style={{ background: "var(--makor-400)" }} />
          <span className="body-sm" style={{ color: "var(--text-secondary)" }}>{label}</span>
        </div>
      </PanelBody>
    </Panel>
  );
}

interface ErrorStateProps {
  title?: string;
  message?: string;
  detail?: ReactNode;
  onRetry?: () => void;
}

export function ErrorState({ title = "Request failed", message, detail, onRetry }: ErrorStateProps) {
  return (
    <Panel highlight className="panel-highlight" style={{ borderLeftColor: "var(--offer)" }}>
      <PanelBody density="premium">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <span className="eyebrow" style={{ color: "var(--offer)" }}>Error</span>
          <span className="heading-3">{title}</span>
          {message ? <span className="body-sm" style={{ color: "var(--text-secondary)" }}>{message}</span> : null}
          {detail ? <span className="caption">{detail}</span> : null}
          {onRetry ? (
            <div>
              <button type="button" className="btn btn-sm" onClick={onRetry}>Retry</button>
            </div>
          ) : null}
        </div>
      </PanelBody>
    </Panel>
  );
}

interface EmptyStateProps {
  title: string;
  message: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <Panel variant="research" highlight>
      <PanelBody density="editorial">
        <div className="masthead-rule" style={{ marginBottom: 20 }} />
        <span className="eyebrow">No briefing</span>
        <h2 className="editorial-h1" style={{ marginTop: 8, maxWidth: 640 }}>{title}</h2>
        <p className="editorial-dek" style={{ marginTop: 12, maxWidth: 640 }}>{message}</p>
        {action ? <div style={{ marginTop: 24 }}>{action}</div> : null}
      </PanelBody>
    </Panel>
  );
}
