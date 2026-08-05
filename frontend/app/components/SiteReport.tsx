import type { DetectResponse, FeatureAvailability, RulesResponse } from "../lib/types";

type SiteReportProps = {
  loading: boolean;
  detection: DetectResponse | null;
  rules: RulesResponse | null;
};

type Tone = "warning" | "clear" | "fail";

const TONE_STYLE: Record<Tone, { bg: string; text: string; icon: string }> = {
  warning: {
    bg: "var(--warn-bg)",
    text: "var(--warn)",
    icon: "⚠",
  },
  clear: {
    bg: "var(--pass-bg)",
    text: "var(--pass)",
    icon: "✓",
  },
  fail: {
    bg: "var(--fail-bg)",
    text: "var(--fail)",
    icon: "✗",
  },
};

function detectionTone(
  feature: FeatureAvailability | undefined
): Tone {
  if (!feature || !feature.available) {
    return "warning";
  }

  return feature.found ? "warning" : "clear";
}

type Row = {
  title: string;
  tone: Tone;
  message: string;
};

function buildRows(
  detection: DetectResponse | null,
  rules: RulesResponse | null
): Row[] {
  const watercourse = detection?.detected_features["watercourses"];
  const woodland = detection?.detected_features["native_woodland"];
  const road = detection?.detected_features["roads"];

  const rows: Row[] = [];

  // Watercourse
  {
    const tone = detectionTone(watercourse);
    const buffers = rules?.watercourse_buffers_m;

    rows.push({
      title: "Watercourse",
      tone,
      message:
        tone === "clear"
          ? "No watercourses detected nearby. Buffer requirements still apply if one is found on-site."
          : `A watercourse was detected nearby.
Maintain:
- ${buffers?.under_2m ?? "—"}m buffer (<2m wide)
- ${buffers?.["2_to_15m"] ?? "—"}m buffer (2–15m wide)
- ${buffers?.over_15m ?? "—"}m buffer (>15m wide)`,
    });
  }


  // Native woodland
  {
    const tone = detectionTone(woodland);

    rows.push({
      title: "Native woodland",
      tone,
      message:
        tone === "clear"
          ? "No native woodland detected nearby."
          : `Native woodland was detected nearby.
Maintain a ${rules?.buffers_m.native_woodland ?? "—"}m buffer from woodland.`,
    });
  }


  // Public road
  {
    const tone = detectionTone(road);

    rows.push({
      title: "Public road",
      tone,
      message:
        tone === "clear"
          ? "No public roads detected nearby."
          : `A road was detected nearby.
Avoid burning within ${rules?.buffers_m.public_road ?? "—"}m where it could damage the road or endanger traffic.`,
    });
  }


  // Peat hags / bare peat — no live data source yet, static reference only.
  rows.push({
    title: "Peat hags & bare peat",
    tone: "warning",
    message: `Check before burning.
Avoid burning within ${rules?.buffers_m.peat_hag ?? "—"}m of peat hags.
Maintain ${rules?.buffers_m.bare_peat_large ?? "—"}m from continuous bare peat areas over 4m².
Best practice: maintain ${rules?.best_practice.distance_from_bare_peat_general_m ?? "—"}m from bare peat generally.`,
  });


  // Artificial drains — no live data source yet, static reference only.
  rows.push({
    title: "Artificial drains",
    tone: "warning",
    message: `Check for artificial drains before burning.
Best practice is to avoid burning within ${rules?.best_practice.distance_from_artificial_drain_m ?? "—"}m of artificial drains.`,
  });


  // Slope — now dynamic, from Copernicus DEM GLO-30.
  {
    const slope = detection?.slope;

    if (!slope) {
      rows.push({
        title: "Slope",
        tone: "warning",
        message: `Draw a site to check slope.
Burning is prohibited above ${rules?.slope.prohibited_degrees ?? "—"}°.
Slopes over ${rules?.slope.assessment_required_degrees ?? "—"}° require a health & safety and soil stability assessment.`,
      });
    } else if (!slope.available) {
      rows.push({
        title: "Slope",
        tone: "warning",
        message: `Slope could not be determined automatically (${slope.error}). Check on-site.
Burning is prohibited above ${rules?.slope.prohibited_degrees ?? "—"}°.
Slopes over ${rules?.slope.assessment_required_degrees ?? "—"}° require assessment.`,
      });
    } else {
      const tone: Tone =
        slope.slope_status === "prohibited"
          ? "fail"
          : slope.slope_status === "assessment_required"
          ? "warning"
          : "clear";

      const headline =
        slope.slope_status === "prohibited"
          ? `Site likely exceeds the ${slope.prohibited_degrees}° prohibited limit.`
          : slope.slope_status === "assessment_required"
          ? `Site likely exceeds ${slope.assess_degrees}° — assessment required.`
          : "Site is within slope limits based on available terrain data.";

      rows.push({
        title: "Slope",
        tone,
        message: `${headline}
Max: ${slope.max_degrees.toFixed(1)}° · 95th percentile: ${slope.p95_degrees.toFixed(1)}° · Mean: ${slope.mean_degrees.toFixed(1)}°
Source: ${slope.source}. ${slope.advisory}`,
      });
    }
  }


  // Peatland
  rows.push({
    title: "Peatland status",
    tone: "warning",
    message:
      "Confirm peat status using the NatureScot peat depth map before burning. Unconfirmed areas should be treated as peatland for planning purposes.",
  });


  return rows;
}


export default function SiteReport({
  loading,
  detection,
  rules,
}: SiteReportProps) {
  const rows = buildRows(detection, rules);

  return (
    <section
      style={{
        background: "var(--paper)",
        border: "1px solid var(--paper-line)",
        borderRadius: "var(--radius)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          color: "var(--paper)",
          background: "var(--moor-700)",
          padding: "8px 12px",
          borderRadius: "var(--radius) var(--radius) 0 0",
        }}
      >
        Site requirements
        {loading && " — checking nearby features…"}
      </div>


      <div
        style={{
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        {rows.map((row) => {
          const style = TONE_STYLE[row.tone];

          return (
            <div
              key={row.title}
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                background: style.bg,
                border: `1px solid ${style.text}`,
                borderRadius: "var(--radius)",
                padding: "10px",
                }}
            >
              <span
                style={{
                  color: style.text,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                }}
              >
                {style.icon}
              </span>

              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 600,
                    fontSize: "13px",
                  }}
                >
                  {row.title}
                </div>

                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: "var(--ink-soft)",
                    marginTop: "4px",
                    whiteSpace: "pre-line",
                  }}
                >
                  {row.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}