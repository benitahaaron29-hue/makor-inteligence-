"use client";

import { useState } from "react";
import { Check, Copy, Download, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { publicBriefingUrl } from "@/lib/share";

interface ShareActionsProps {
  briefingDate: string;
  briefingTitle: string;
}

/**
 * Two clean systems, surfaced as three actions:
 *
 *   1. Copy link   — production-safe share URL via publicBriefingUrl().
 *                    Never localhost. Falls back to placeholder host when
 *                    NEXT_PUBLIC_SITE_URL is not configured.
 *   2. Export HTML — downloads the self-contained institutional document
 *                    from GET /briefings/[date]/export. No app shell, no
 *                    Next.js chunks, no localhost references.
 *   3. Send to desk — mailto with the public share URL in the body.
 */
export function ShareActions({ briefingDate, briefingTitle }: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareUrl = publicBriefingUrl(briefingDate);

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Copy briefing link:", shareUrl);
    }
  };

  const handleExportHtml = async () => {
    if (typeof window === "undefined") return;
    setExporting(true);
    setError(null);
    try {
      const res = await fetch(`/briefings/${encodeURIComponent(briefingDate)}/export`, {
        method: "GET",
        cache: "no-store",
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(detail || `Export failed (HTTP ${res.status})`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `makor-briefing-${briefingDate}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const handleSendDesk = () => {
    if (typeof window === "undefined") return;
    const subject = `Morning FX & Macro Briefing — ${briefingDate}`;
    const body = [
      `Morning all,`,
      ``,
      `Today's Morning FX & Macro briefing is live.`,
      `Headline: ${briefingTitle}`,
      ``,
      `Read in full: ${shareUrl}`,
      ``,
      `Confidential — for desk distribution only. Not for client redistribution.`,
      `— Makor Securities · Macro & FX Desk`,
    ].join("\n");
    const mailto = `mailto:macro-fx-desk@makor.example?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <>
      {error ? (
        <span className="caption" style={{ color: "var(--offer)", marginRight: 6 }}>
          {error}
        </span>
      ) : null}
      <Button size="sm" onClick={handleCopyLink} type="button" title={`Copy link · ${shareUrl}`}>
        {copied ? (
          <Check size={12} aria-hidden style={{ marginRight: 4, color: "var(--bid)" }} />
        ) : (
          <Copy size={12} aria-hidden style={{ marginRight: 4 }} />
        )}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button
        size="sm"
        onClick={handleExportHtml}
        disabled={exporting}
        type="button"
        title="Export briefing as a standalone institutional document"
      >
        <Download size={12} aria-hidden style={{ marginRight: 4 }} />
        {exporting ? "Exporting…" : "Export HTML"}
      </Button>
      <Button size="sm" onClick={handleSendDesk} type="button" title="Send briefing to desk distribution list">
        <Send size={12} aria-hidden style={{ marginRight: 4 }} />
        Send to desk
      </Button>
    </>
  );
}
