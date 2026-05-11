import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { StatusTicker } from "./StatusTicker";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "var(--layout-sidebar-w) 1fr",
        minHeight: "100vh",
        background: "var(--surface-base)",
      }}
    >
      <Sidebar />
      <main style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", minWidth: 0 }}>
          {children}
        </div>
        <StatusTicker />
      </main>
    </div>
  );
}
