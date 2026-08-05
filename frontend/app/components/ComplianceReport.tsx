"use client";

import type { EvaluateResponse, GeoJSONPolygon, ReadinessStatus } from "../lib/types";
import { deriveStatus } from "../lib/deriveStatus";
import { useState } from "react";

type ComplianceReportProps = {
  loading: boolean;
  data: EvaluateResponse | null;
  polygon: GeoJSONPolygon | null;
};

const ICONS: Record<ReadinessStatus, string> = {
  pass: "✓",
  warning: "⚠",
  fail: "✗",
  unknown: "?",
};

const COLORS: Record<ReadinessStatus, string> = {
  pass: "var(--pass)",
  warning: "var(--warn)",
  fail: "var(--fail)",
  unknown: "var(--ink-soft)",
};

const BGS: Record<ReadinessStatus, string> = {
  pass: "var(--pass-bg)",
  warning: "var(--warn-bg)",
  fail: "var(--fail-bg)",
  unknown: "var(--paper-line)",
};

const PRE_BURN_CHECKLIST = [
  "Weather forecast reviewed",
  "Fire Danger Rating checked",
  "Landowners / occupiers notified",
  "SFRS Control Centre notified before burning",
];

function polygonCentroid(polygon: GeoJSONPolygon): { lat: number; lon: number } {
  const coords = polygon.geometry.coordinates[0];

  const [sumLon, sumLat] = coords.reduce(
    ([lon, lat], [x, y]) => [lon + x, lat + y],
    [0, 0]
  );

  return {
    lat: sumLat / coords.length,
    lon: sumLon / coords.length,
  };
}

export default function ComplianceReport({
  loading,
  data,
  polygon,
}: ComplianceReportProps) {
  if (!loading && !data) return null;

  const centroid = polygon ? polygonCentroid(polygon) : null;
  const [checkedItems, setCheckedItems] = useState(PRE_BURN_CHECKLIST.map(() => false));

  return (
    <section style={{ margin: "0 20px 20px" }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: "14px",
          color: "var(--paper)",
          margin: "0 0 8px",
        }}
      >
        Notification & burn preparation report
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
        {loading && (
          <p style={{ fontSize: "13px", color: "var(--ink-soft)" }}>
            Checking notification and burn preparation requirements…
          </p>
        )}

        {!loading && data && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              <div>
                <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
                  LOCATION
                </div>
                <div style={{ fontSize: "13px" }}>
                  {centroid
                    ? `${centroid.lat.toFixed(5)}, ${centroid.lon.toFixed(5)}`
                    : "—"}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
                  GENERATED
                </div>
                <div style={{ fontSize: "13px" }}>
                  {new Date(data.generated).toLocaleString("en-GB")}
                </div>
              </div>

              <div>
                <div style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
                  RULESET
                </div>
                <div style={{ fontSize: "13px" }}>
                  {data.ruleset_version}
                </div>
              </div>
            </div>


            <div
              style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--moor-900)",
                marginBottom: "6px",
                fontFamily: "var(--font-display)",
              }}
            >
              DATE, TIMING & NOTIFICATION CHECKS
            </div>


            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
                marginBottom: "16px",
              }}
            >
              {data.checks
                .filter((c) =>
                  [
                    "season",
                    "burn_timing",
                    "landowner_notification",
                  ].includes(c.check)
                )
                .map((check) => {
                  const { status, message } = deriveStatus(check);

                  return (
                    <div
                      key={check.check}
                      style={{
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                        fontSize: "13px",
                        padding: "8px 10px",
                        background: BGS[status],
                        border: `1px solid ${COLORS[status]}`,
                        borderRadius: "var(--radius)",
                      }}
                    >
                      <span
                        style={{
                          color: COLORS[status],
                          fontWeight: 700,
                        }}
                      >
                        {ICONS[status]}
                      </span>

                      <span>{message}</span>
                    </div>
                  );
                })}
            </div>


            {(() => {
              const sfrs = data.checks.find(
                (c) => c.check === "sfrs_contact"
              );

              if (!sfrs) return null;

              const { message } = deriveStatus(sfrs);

              return (
                <div
                  style={{
                    fontSize: "13px",
                    padding: "8px 10px",
                    background: "var(--paper-line)",
                    borderRadius: "var(--radius)",
                  }}
                >
                  <strong>SFRS contact:</strong> {message}
                </div>
              );
            })()}

            <div style={{
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--moor-900)",
                marginTop: "16px",
                marginBottom: "6px",
                fontFamily: "var(--font-display)",
              }}
            >
              BEFORE BURNING
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {PRE_BURN_CHECKLIST.map((item, i) => (
                <label
                  key={item}
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                    fontSize: "13px",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checkedItems[i]}
                    onChange={(e) =>
                      setCheckedItems((prev) =>
                        prev.map((checked, index) =>
                          index === i ? e.target.checked : checked
                        )
                      )
                    }
                  />
                  {item}
                </label>
              ))}
            </div>


            <p
              style={{
                fontSize: "11px",
                color: "var(--ink-soft)",
                marginTop: "14px",
                marginBottom: 0,
              }}
            >
              This report covers notification, timing and seasonal
              requirements. Site features and required buffers are shown in the
              site report above.
            </p>
          </>
        )}
      </div>
    </section>
  );
}