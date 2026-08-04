import type { DetectResponse } from "../lib/types";

const FEATURE_LABELS: Record<string, string> = {
  roads: "Roads (OS Open Zoomstack)",
  watercourses: "Watercourses (OS Open Zoomstack)",
  native_woodland: "Native woodland (OS Open Zoomstack)",
  bare_peat: "Bare peat layer",
};

type DetectionPanelProps = {
  loading: boolean;
  data: DetectResponse | null;
};

export default function DetectionPanel({ loading, data }: DetectionPanelProps) {
  if (!loading && !data) return null;

  return (
    <section style={{ background: "#fff", border: "1px solid var(--paper-line)", borderRadius: "var(--radius)" }}>
      <h2 style={sectionHeaderStyle}>Nearby features detected</h2>
      <div style={{ padding: "12px 16px" }}>
        {loading && <p style={mutedMono}>Querying OS Open data for roads, watercourses and woodland near the site…</p>}

        {!loading && data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
              {Object.entries(data.detected_features).map(([key, feature]) => (
                <div
                  key={key}
                  style={{
                    border: "1px solid var(--paper-line)",
                    borderRadius: "var(--radius)",
                    padding: "10px 12px",
                    background: !feature.available ? "var(--warn-bg)" : feature.found ? "var(--pass-bg)" : "var(--paper)",
                  }}
                >
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "13px" }}>
                    {FEATURE_LABELS[key] ?? key}
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: "12px", marginTop: "4px", color: "var(--ink-soft)" }}>
                    {!feature.available
                      ? `Unavailable — ${feature.error}`
                      : feature.found
                      ? `${feature.count ?? "some"} feature(s) found nearby`
                      : "None found nearby"}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ ...mutedMono, marginTop: "10px" }}>
              These are automated proximity hints from OS Open data, not survey-grade measurements. Confirm exact
              distances on-site before relying on any buffer check below.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

const sectionHeaderStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: "var(--font-display)",
  fontWeight: 700,
  fontSize: "14px",
  padding: "10px 16px",
  background: "var(--moor-700)",
  color: "var(--paper)",
  borderRadius: "var(--radius) var(--radius) 0 0",
};

const mutedMono: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: "12px",
  color: "var(--ink-soft)",
  margin: 0,
};