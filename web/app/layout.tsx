import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource-variable/source-serif-4";
import "./globals.css";

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { StatusTicker } from "@/components/layout/status-ticker";
import { briefingsApi } from "@/lib/api/briefings";

// Favicon — points at the authoritative Makor asset. Browsers downscale
// the source PNG (168 x 180) to whatever resolution they need for tabs,
// bookmarks, and home-screen icons.
const FAVICON = "/brand/makor-logo.png";

export const metadata: Metadata = {
  title: {
    default: "Makor Intelligence · Macro & FX Desk",
    template: "%s · Makor Intelligence",
  },
  description:
    "Institutional FX & Macro intelligence platform. Morning Briefing engine, analytics, archive.",
  applicationName: "Makor Intelligence Platform",
  authors: [{ name: "Makor Securities · Macro & FX Desk" }],
  icons: {
    icon: [{ url: FAVICON, type: "image/png", sizes: "168x180" }],
    apple: [{ url: FAVICON, type: "image/png" }],
    shortcut: [{ url: FAVICON, type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: 1280,
  themeColor: "#08111F",
};

// Ensure shell data is fetched at request time so the regime indicator + ticker
// reflect the latest briefing without manual refresh.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Fetch the latest briefing at the layout level. If the backend is down,
  // fall back to nulls — the rest of the shell renders without it.
  let latest = null;
  try {
    latest = await briefingsApi.latest();
  } catch {
    latest = null;
  }

  return (
    <html lang="en">
      <body>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "var(--layout-sidebar-w) 1fr",
            minHeight: "100vh",
            background: "var(--surface-base)",
          }}
        >
          <Sidebar
            regimeTone={latest?.risk_tone ?? null}
            briefingDate={latest?.briefing_date ?? null}
          />
          <main style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ flex: "1 1 auto", display: "flex", flexDirection: "column", minWidth: 0 }}>
              {children}
            </div>
            <StatusTicker snapshot={latest?.market_snapshot ?? null} />
          </main>
        </div>
      </body>
    </html>
  );
}
