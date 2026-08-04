"use client";

import { useState } from "react";
import type { EvaluateResponse, GeoJSONPolygon, ReadinessStatus } from "../lib/types";
import { deriveStatus } from "../lib/deriveStatus";

type ComplianceReportProps = {
  loading: boolean;
  data: EvaluateResponse | null;
  polygon: GeoJSONPolygon | null;
};

const ICONS: Record<ReadinessStatus, string> = { pass: "✓", warning: "⚠", fail: "✗" };
const COLORS: Record<ReadinessStatus, string> = { pass: "var(--pass)", warning: "var(--warn)", fail: "var(--fail)" };
const BGS: Record<ReadinessStatus, string> = { pass: "var(--pass-bg)", warning: "var(--warn-bg)", fail: "var(--fail-bg)" };

const MANUAL_CHECKS = [
  "Weather forecast reviewed",
  "Fire Danger Rating checked (SFRS wildfire page)",
  "Landowner / occupier notified",
  "SFRS Control Centre notified before burn",
];

function polygonCentroid(polygon: GeoJSONPolygon): { lat: number; lon: number } {
  const coords = polygon.geometry.coordinates[0];
  const [sumLon, sumLat] = coords.reduce(([lon, lat], [x, y]) => [lon + x, lat + y], [0, 0]);
  return { lat: sumLat / coords.length, lon: sumLon / coords.length };
}

export default function ComplianceReport({ loading, data, polygon }: ComplianceReportProps) {
  const [manualChecked, setManualChecked] = useState<boolean[]>(MANUAL_CHECKS.map(() => false));

  if (!loading && !data) return null;

  const centroid = polygon ? polygonCentroid(polygon) : null;

  return (
    <section style={{ margin: "0 20px 20px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--paper)", margin: "0 0 8px" }}>
        Muirburn preparation checklist
      </h2>

      <div
        style={{
          background: "var(--paper)",
          border: "1px solid var(--paper-line)",
          borderRadius: "var(--radius)",
          padding: "18px 20px",
          fontFamily: "var(--font-mono)",
        }}
      >
        {loading && <p style={{ fontSize: "13px", color: "var(--ink-soft)" }}>Running compliance checks against the ruleset…</p>}

        {!loading && data && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "14px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>LOCATION</div>
                <div style={{ fontSize: "13px" }}>{centroid ? `${centroid.lat.toFixed(5)}, ${centroid.lon.toFixed(5)}` : "—"}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>GENERATED</div>
                <div style={{ fontSize: "13px" }}>{new Date(data.generated).toLocaleString("en-GB")}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>RULESET</div>
                <div style={{ fontSize: "13px" }}>
                  {data.ruleset_version} <span style={{ color: "var(--ink-soft)" }}>(verified {data.last_verified})</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--moor-900)", marginBottom: "6px", fontFamily: "var(--font-display)" }}>
              AUTOMATED CHECKS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px" }}>
              {data.checks
                .filter((c) => c.check !== "sfrs_contact")
                .map((c) => {
                  const { status, message } = deriveStatus(c);
                  return (
                    <div
                      key={c.check}
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                        fontSize: "13px",
                        padding: "5px 8px",
                        background: BGS[status],
                        borderRadius: "var(--radius)",
                      }}
                    >
                      <span style={{ color: COLORS[status], fontWeight: 700 }}>{ICONS[status]}</span>
                      <span>{message}</span>
                    </div>
                  );
                })}
            </div>

            {(() => {
              const sfrsCheck = data.checks.find((c) => c.check === "sfrs_contact");
              if (!sfrsCheck) return null;
              const { message } = deriveStatus(sfrsCheck);
              return (
                <div style={{ fontSize: "12px", color: "var(--ink-soft)", marginBottom: "16px" }}>
                  <strong style={{ color: "var(--ink)" }}>SFRS contact: </strong>
                  {message}
                </div>
              );
            })()}

            <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--moor-900)", marginBottom: "6px", fontFamily: "var(--font-display)" }}>
              MANUAL CHECKS
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {MANUAL_CHECKS.map((label, i) => (
                <label key={label} style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "13px" }}>
                  <input
                    type="checkbox"
                    checked={manualChecked[i]}
                    onChange={(e) =>
                      setManualChecked((prev) => prev.map((v, idx) => (idx === i ? e.target.checked : v)))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}