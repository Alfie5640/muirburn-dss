"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import Header from "./components/Header";
import SiteReport from "./components/SiteReport";
import BurnPrepForm, { type TimingData } from "./components/BurnPrepForm";
import ComplianceReport from "./components/ComplianceReport";

import {
  detectFeatures,
  evaluateAssessment,
  getRules,
  ApiError,
} from "./lib/api";

import type {
  AssessmentRequest,
  DetectResponse,
  EvaluateResponse,
  GeoJSONPolygon,
  RulesResponse,
} from "./lib/types";

import type { BurnMapProps } from "./components/BurnMap";

const BurnMap = dynamic<BurnMapProps>(() => import("./components/BurnMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        flex: "1 1 auto",
        minHeight: "320px",
        background: "var(--paper)",
        borderRadius: "var(--radius)",
      }}
    />
  ),
});

function isoDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

export default function Home() {
  const [polygon, setPolygon] = useState<GeoJSONPolygon | null>(null);

  const [rules, setRules] = useState<RulesResponse | null>(null);

  const [detection, setDetection] = useState<DetectResponse | null>(null);
  const [detecting, setDetecting] = useState(false);

  const [evaluation, setEvaluation] = useState<EvaluateResponse | null>(null);

  const [evaluating, setEvaluating] = useState(false);

  const [error, setError] = useState<string | null>(null);


  // Load current ruleset
  useEffect(() => {
    getRules()
      .then(setRules)
      .catch((err) => {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load ruleset."
        );
      });
  }, []);


  // Run GIS detection whenever polygon changes
  useEffect(() => {
    if (!polygon) {
      setDetection(null);
      setEvaluation(null);
      setError(null);
      return;
    }

    let cancelled = false;

    setDetecting(true);
    setError(null);

    detectFeatures(polygon)
      .then((result) => {
        if (!cancelled) {
          setDetection(result);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            err instanceof ApiError
              ? err.message
              : "Could not detect nearby features."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetecting(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [polygon]);


  async function runEvaluation(timing: TimingData) {
    setError(null);
    setEvaluation(null);
    setEvaluating(true);

    const payload: AssessmentRequest = {
      burn_date: timing.burn_date,

      planned_time: isoDateTime(
        timing.burn_date,
        timing.planned_time
      ),

      sunrise_time: isoDateTime(
        timing.burn_date,
        timing.sunrise_time
      ),

      sunset_time: isoDateTime(
        timing.burn_date,
        timing.sunset_time
      ),

      notification_date: timing.notification_date,
      previous_season_end: timing.previous_season_end,

      sfrs_region: timing.sfrs_region,
    };


    try {
      const evaluationResult = await evaluateAssessment(payload);

      setEvaluation(evaluationResult);

    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Something went wrong running the compliance check."
      );
    } finally {
      setEvaluating(false);
    }
  }


  return (
    <main style={{ minHeight: "100vh" }}>

      <Header />


      <div
        style={{
          display: "flex",
          gap: "20px",
          margin: "20px",
          flexWrap: "wrap",
          alignItems: "stretch",
          minHeight: "640px",
        }}
      >

        <div
          style={{
            flex: "1 1 60%",
            minWidth: "320px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >

          <BurnMap
            polygon={polygon}
            onPolygonChange={setPolygon}
          />


          {polygon && (
            <SiteReport
              loading={detecting}
              detection={detection}
              rules={rules}
            />
          )}

        </div>


        <div
          style={{
            flex: "1 1 38%",
            minWidth: "300px",
            display: "flex",
          }}
        >

          {!polygon ? (

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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Draw the proposed burn site to begin.
              Nearby features will be checked against the Muirburn Code.
            </div>

          ) : (

            <BurnPrepForm
              submitting={evaluating}
              onSubmit={runEvaluation}
            />

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


      {(evaluating || evaluation) && (
        <ComplianceReport
          loading={evaluating}
          data={evaluation}
          polygon={polygon}
        />
      )}

    </main>
  );
}