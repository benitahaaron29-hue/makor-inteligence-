"use client";

/**
 * Client-side narrative hydrator.
 *
 * Wraps the BriefingReader. On mount, fires a single GET to /api/narrative,
 * receives the validated NarrativeOutput (or null), and merges it into
 * the shell briefing via the pure `mergeNarrativeIntoBriefing` helper.
 * The reader then re-renders with LLM-generated content in the
 * narrative-driven slots; template content is preserved everywhere the
 * LLM declined to write.
 *
 * Why this exists: the full briefing generator's LLM step pushes total
 * request latency past Vercel Hobby's serverless budget, causing
 * FUNCTION_INVOCATION_TIMEOUT and connection-closed errors on the page
 * route. Splitting the LLM call into its own request keeps the initial
 * page render snappy (~1-3s) and gives the synthesis step its own 60s
 * window.
 *
 * Graceful degradation:
 *   - Fetch fails (network, abort, non-200) → shell content stays put.
 *   - LLM returned null (no-key / api-fail / validate-fail) → shell stays.
 *   - LLM returned a usable field → merged.
 *   - LLM returned an unusable field (matched isLLMFieldUsable) → shell stays.
 *
 * Status indicator: a single discreet strip at the top of the reader
 * communicates the hydration phase to the operator. The strip carries
 * the `no-print` class so exported PDFs stay clean.
 */

import { useEffect, useState } from "react";
import { BriefingReader } from "./briefing-reader";
import { mergeNarrativeIntoBriefing } from "@/lib/briefing/merger";
import type { BriefingRead } from "@/lib/types/briefing";
import type { NarrativeOutput, NarrativeDiagnostics } from "@/lib/narrative/types";

interface NarrativeHydratorProps {
  briefing: BriefingRead;
}

type HydrationPhase =
  | { kind: "skipped" }                         // briefing already full — nothing to do
  | { kind: "loading" }                         // fetch in flight
  | { kind: "ready" }                           // success, LLM content merged
  | { kind: "template"; reason: string }        // fetch returned but no usable narrative
  | { kind: "timeout" }                         // client-side timeout fired
  | { kind: "error"; message: string };         // network / abort / non-200

/**
 * Hard client-side ceiling on the /api/narrative call. Sits just under
 * Vercel Hobby's 60s function budget so a server hang transitions the
 * banner from "Synthesising…" to "timed out — template content rendered"
 * rather than spinning indefinitely. Independent of the server-side
 * LLM_TIMEOUT_MS — both fire defensively.
 */
const CLIENT_FETCH_TIMEOUT_MS = 55_000;

interface NarrativeApiResponse {
  narrative: NarrativeOutput | null;
  diagnostics: NarrativeDiagnostics;
}

export function NarrativeHydrator({ briefing }: NarrativeHydratorProps) {
  const renderStage =
    (briefing.generation_metadata?.render_stage as string | undefined) ?? "shell";
  const alreadyFull = renderStage === "full";
  // Demo-mode briefings carry their own disclosure banner and the
  // /api/narrative endpoint short-circuits to null in demo mode. Skip
  // the fetch so the operator doesn't see a redundant "narrative
  // unavailable · demo-mode" strip on top of the demo banner.
  const isDemo = briefing.data_provenance === "demo";
  const skip = alreadyFull || isDemo;

  const [current, setCurrent] = useState<BriefingRead>(briefing);
  const [phase, setPhase] = useState<HydrationPhase>(
    skip ? { kind: "skipped" } : { kind: "loading" },
  );

  useEffect(() => {
    if (skip) return;
    const controller = new AbortController();
    let cancelled = false;
    let timedOut = false;
    const timeoutTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, CLIENT_FETCH_TIMEOUT_MS);

    fetch("/api/narrative", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as NarrativeApiResponse;
      })
      .then((payload) => {
        if (cancelled) return;
        clearTimeout(timeoutTimer);
        const narrative = payload.narrative;
        if (narrative) {
          const diagnostics = payload.diagnostics;
          setCurrent((prev) => mergeNarrativeIntoBriefing(prev, narrative, diagnostics));
          setPhase({ kind: "ready" });
        } else {
          setPhase({
            kind: "template",
            reason: payload.diagnostics.last_error ?? payload.diagnostics.last_result ?? "no-narrative",
          });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        clearTimeout(timeoutTimer);
        if (timedOut) {
          setPhase({ kind: "timeout" });
          return;
        }
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("abort")) return;
        setPhase({ kind: "error", message: msg });
      });

    return () => {
      cancelled = true;
      clearTimeout(timeoutTimer);
      controller.abort();
    };
  }, [skip]);

  return (
    <>
      <NarrativeHydrationBanner phase={phase} />
      <BriefingReader briefing={current} />
    </>
  );
}

// =================================================================== STATUS BANNER

function NarrativeHydrationBanner({ phase }: { phase: HydrationPhase }) {
  if (phase.kind === "skipped" || phase.kind === "ready") return null;

  const baseStyle: React.CSSProperties = {
    margin: "10px 16px 0",
    padding: "8px 12px",
    borderRadius: 3,
    fontSize: 11,
    letterSpacing: "0.04em",
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-inset)",
    color: "var(--text-tertiary)",
  };

  if (phase.kind === "loading") {
    return (
      <div
        className="narrative-hydration-banner narrative-hydration-loading no-print"
        style={{ ...baseStyle, display: "flex", alignItems: "center", gap: 10 }}
        aria-live="polite"
      >
        <span className="narrative-hydration-spinner" aria-hidden />
        <span>
          <strong style={{ color: "var(--text-secondary)" }}>Synthesising narrative</strong>
          {" · LLM provider call in flight · narrative-driven sections show the institutional template until the response lands."}
        </span>
      </div>
    );
  }

  if (phase.kind === "template") {
    return (
      <div
        className="narrative-hydration-banner narrative-hydration-template no-print"
        style={baseStyle}
      >
        <strong style={{ color: "var(--text-secondary)" }}>Narrative unavailable</strong>
        {" · "}
        {phase.reason}
        {" · template content rendered. See /api/diag for provider state."}
      </div>
    );
  }

  if (phase.kind === "timeout") {
    return (
      <div
        className="narrative-hydration-banner narrative-hydration-timeout no-print"
        style={{ ...baseStyle, borderLeft: "2px solid var(--accent-brass)" }}
      >
        <strong style={{ color: "var(--accent-brass)" }}>Narrative request timed out</strong>
        {" · LLM call exceeded the client budget · template content rendered."}
      </div>
    );
  }

  return (
    <div
      className="narrative-hydration-banner narrative-hydration-error no-print"
      style={{ ...baseStyle, borderLeft: "2px solid var(--accent-brass)" }}
    >
      <strong style={{ color: "var(--accent-brass)" }}>Narrative request failed</strong>
      {" · "}
      {phase.message}
      {" · template content rendered."}
    </div>
  );
}
