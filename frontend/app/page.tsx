"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import Header from "./components/Header";
import AssessmentForm from "./components/AssessmentForm";
import DetectionPanel from "./components/DetectionPanel";
import ComplianceReport from "./components/ComplianceReport";
import BurnReadiness from "./components/BurnReadiness";

import { detectFeatures, evaluateAssessment, getBurnReadiness, ApiError } from "./lib/api";
import { getReadinessChecks } from "./lib/deriveStatus";
import type { AssessmentRequest, BurnReadinessResponse, DetectResponse, EvaluateResponse, GeoJSONPolygon } from "./lib/types";
import type { BurnMapProps } from "./components/BurnMap";

// Leaflet needs `window`, so the map can only render on the client.
// The generic is required here — without it, TS can't infer BurnMap's props
// through the dynamic import and falls back to treating it as prop-less.
const BurnMap = dynamic<BurnMapProps>(() => import("./components/BurnMap"), {
  ssr: false,
  loading: () => (
    <div style={{ flex: "1 1 auto", minHeight: "320px", background: "var(--paper)", borderRadius: "var(--radius)" }} />
  ),
});

// Phases mirror the intended workflow:
//   draw    — only the map is meaningful yet
//   detect  — polygon exists, /detect is running automatically
//   survey  — detection results are in, form is open for the user to fill in / confirm
//   evaluate — form submitted, /evaluate then /burn-readiness run in sequence
//   done    — full result set on screen
type Phase = "draw" | "detect" | "survey" | "evaluate" | "done";

export default function Home() {
  const [polygon, setPolygon] = useState<GeoJSONPolygon | null>(null);
  const [phase, setPhase] = useState<Phase>("draw");

  const [detection, setDetection] = useState<DetectResponse | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null);
  const [readiness, setReadiness] = useState<BurnReadinessResponse | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Drawing (or clearing) a polygon automatically kicks off detection —
  // no button needed. This is the "phase 2 fires on its own" behaviour.
  useEffect(() => {
    if (!polygon) {
      setPhase("draw");
      setDetection(null);
      setEvaluation(null);
      setReadiness(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setPhase("detect");
    setError(null);

    detectFeatures(polygon)
      .then((result) => {
        if (cancelled) return;
        setDetection(result);
        setPhase("survey");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Could not detect nearby features.");
        // Still let the user proceed to the form even if detection failed —
        // they can fill everything in manually.
        setPhase("survey");
      });

    return () => {
      cancelled = true;
    };
  }, [polygon]);

  async function runEvaluation(payload: AssessmentRequest) {
    setError(null);
    setEvaluation(null);
    setReadiness(null);

    try {
      setPhase("evaluate");
      const evaluateResult = await evaluateAssessment(payload);
      setEvaluation(evaluateResult);

      const readinessChecks = getReadinessChecks(evaluateResult.checks);
      const readinessResult = await getBurnReadiness(readinessChecks);
      setReadiness(readinessResult);
      setPhase("done");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong running the check.");
      setPhase("survey");
    }
  }

  return (
    <main style={{ minHeight: "100vh" }}>
      <Header />

      <div style={{ display: "flex", gap: "20px", margin: "20px", flexWrap: "wrap", alignItems: "stretch", minHeight: "640px" }}>
        <div style={{ flex: "1 1 60%", minWidth: "320px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <BurnMap polygon={polygon} onPolygonChange={setPolygon} />

          {phase !== "draw" && <DetectionPanel loading={phase === "detect"} data={detection} />}
        </div>

        <div style={{ flex: "1 1 38%", minWidth: "300px", display: "flex" }}>
          {phase === "draw" ? (
            <div
              style={{
                background: "var(--paper)",
                border: "1px dashed var(--paper-line)",
                borderRadius: "var(--radius)",
                padding: "24px",
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                color: "var(--ink-soft)",
                textAlign: "center",
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Draw the proposed burn site on the map to begin. Nearby watercourses, woodland, roads and peat will be
              checked automatically, then the form will open for the fields that still need a site visit.
            </div>
          ) : (
            <AssessmentForm detection={detection} submitting={phase === "evaluate"} onSubmit={runEvaluation} />
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            margin: "0 20px 20px",
            padding: "12px 16px",
            background: "var(--fail-bg)",
            color: "var(--fail)",
            border: "1px solid var(--fail)",
            borderRadius: "var(--radius)",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      {(phase === "evaluate" || phase === "done") && (
        <>
          <ComplianceReport loading={phase === "evaluate"} data={evaluation} polygon={polygon} />
          <BurnReadiness loading={phase === "evaluate" && !!evaluation} data={readiness} />
        </>
      )}
    </main>
  );
}