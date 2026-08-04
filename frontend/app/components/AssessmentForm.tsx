"use client";

import { useMemo, useState } from "react";
import type { AssessmentRequest, DetectResponse, PeatlandStatus, SfrsRegion } from "../lib/types";

type AssessmentFormProps = {
  detection: DetectResponse | null; // drives which fields are flagged as required vs. defaulted
  submitting: boolean;
  onSubmit: (payload: AssessmentRequest) => void;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

// Distance assumed when GIS found nothing of that type nearby within the
// query bbox — large enough to clear every buffer in the ruleset, but the
// user can always override it if they know better.
const ASSUMED_CLEAR_DISTANCE_M = "100";

const initialState = {
  burn_date: todayISO(),
  planned_time: "12:00",
  sunrise_time: "07:30",
  sunset_time: "18:00",

  slope_degrees: "",
  watercourse_width_m: "",
  watercourse_distance_m: "",
  peat_hag_distance_m: "",
  bare_peat_area_m2: "",
  bare_peat_distance_m: "",
  native_woodland_distance_m: "",
  public_road_distance_m: "",
  artificial_drain_distance_m: "",
  peatland_status: "uncertain" as PeatlandStatus,
  notification_date: todayISO(),
  previous_season_end: "",
  sfrs_region: "general" as SfrsRegion,
};

type FormState = typeof initialState;

const labelStyle: React.CSSProperties = {
  display: "block",
  fontFamily: "var(--font-mono)",
  fontSize: "11px",
  color: "var(--ink-soft)",
  marginBottom: "3px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid var(--paper-line)",
  borderRadius: "var(--radius)",
  fontSize: "13px",
  background: "#fff",
};

function Field({
  label,
  hint,
  hintTone,
  children,
}: {
  label: string;
  hint?: string;
  hintTone?: "found" | "clear" | "unavailable";
  children: React.ReactNode;
}) {
  const hintColor = hintTone === "found" ? "var(--warn)" : hintTone === "unavailable" ? "var(--ink-soft)" : "var(--pass)";
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: hintColor, marginTop: "2px" }}>{hint}</div>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <fieldset style={{ border: "none", padding: 0, margin: "0 0 16px" }}>
      <legend
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "13px",
          color: "var(--moor-900)",
          padding: 0,
          marginBottom: subtitle ? "2px" : "8px",
          borderBottom: "1px solid var(--paper-line)",
          width: "100%",
          paddingBottom: "4px",
        }}
      >
        {title}
      </legend>
      {subtitle && (
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--ink-soft)", margin: "0 0 8px" }}>{subtitle}</p>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>{children}</div>
    </fieldset>
  );
}

// Maps a /detect feature key to a hint the user sees next to the related field(s).
function featureHint(
  detection: DetectResponse | null,
  key: string
): { text: string; tone: "found" | "clear" | "unavailable"; defaultDistance: string | null } {
  const feature = detection?.detected_features[key];
  if (!feature) return { text: "Checking…", tone: "unavailable", defaultDistance: null };
  if (!feature.available) return { text: `GIS data unavailable (${feature.error}) — confirm on-site`, tone: "unavailable", defaultDistance: null };
  if (feature.found) return { text: `⚠ ${feature.count ?? "some"} found nearby — confirm exact distance`, tone: "found", defaultDistance: null };
  return { text: "None detected nearby — defaulted to clear, override if needed", tone: "clear", defaultDistance: ASSUMED_CLEAR_DISTANCE_M };
}

export default function AssessmentForm({ detection, submitting, onSubmit }: AssessmentFormProps) {
  const [form, setForm] = useState<FormState>(initialState);
  const [touched, setTouched] = useState<Set<string>>(new Set());

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => new Set(prev).add(key));
  }

  const watercourseHint = featureHint(detection, "watercourses");
  const woodlandHint = featureHint(detection, "native_woodland");
  const roadHint = featureHint(detection, "roads");
  const bareHint = featureHint(detection, "bare_peat");

  // Auto-fill "assumed clear" defaults once /detect resolves, but never
  // overwrite something the user has already typed themselves.
  useMemo(() => {
    setForm((prev) => {
      const next = { ...prev };
      let changed = false;
      if (watercourseHint.defaultDistance && !touched.has("watercourse_distance_m") && prev.watercourse_distance_m === "") {
        next.watercourse_distance_m = watercourseHint.defaultDistance;
        next.watercourse_width_m = prev.watercourse_width_m || "0";
        changed = true;
      }
      if (woodlandHint.defaultDistance && !touched.has("native_woodland_distance_m") && prev.native_woodland_distance_m === "") {
        next.native_woodland_distance_m = woodlandHint.defaultDistance;
        changed = true;
      }
      if (roadHint.defaultDistance && !touched.has("public_road_distance_m") && prev.public_road_distance_m === "") {
        next.public_road_distance_m = roadHint.defaultDistance;
        changed = true;
      }
      if (bareHint.defaultDistance && !touched.has("bare_peat_distance_m") && prev.bare_peat_distance_m === "") {
        next.bare_peat_distance_m = bareHint.defaultDistance;
        next.bare_peat_area_m2 = prev.bare_peat_area_m2 || "0";
        changed = true;
      }
      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detection]);

  const notificationReminder = useMemo(() => {
    if (!form.burn_date || !form.notification_date) return null;
    const burnDate = new Date(form.burn_date);
    const latestAllowed = new Date(burnDate);
    latestAllowed.setDate(latestAllowed.getDate() - 7);
    const notifyDate = new Date(form.notification_date);
    const onTime = notifyDate <= latestAllowed;
    const afterPrevSeason = form.previous_season_end ? notifyDate > new Date(form.previous_season_end) : null;
    return {
      onTime,
      afterPrevSeason,
      latestAllowedISO: latestAllowed.toISOString().slice(0, 10),
    };
  }, [form.burn_date, form.notification_date, form.previous_season_end]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const numericFields: (keyof FormState)[] = [
      "slope_degrees",
      "watercourse_width_m",
      "watercourse_distance_m",
      "peat_hag_distance_m",
      "bare_peat_area_m2",
      "bare_peat_distance_m",
      "native_woodland_distance_m",
      "public_road_distance_m",
      "artificial_drain_distance_m",
    ];
    const missing = numericFields.filter((f) => form[f] === "");
    if (missing.length > 0 || !form.previous_season_end) {
      alert("Please fill in every field before running the check.");
      return;
    }

    const payload: AssessmentRequest = {
      burn_date: form.burn_date,
      planned_time: `${form.burn_date}T${form.planned_time}:00`,
      sunrise_time: `${form.burn_date}T${form.sunrise_time}:00`,
      sunset_time: `${form.burn_date}T${form.sunset_time}:00`,

      slope_degrees: Number(form.slope_degrees),

      watercourse_width_m: Number(form.watercourse_width_m),
      watercourse_distance_m: Number(form.watercourse_distance_m),

      peat_hag_distance_m: Number(form.peat_hag_distance_m),

      bare_peat_area_m2: Number(form.bare_peat_area_m2),
      bare_peat_distance_m: Number(form.bare_peat_distance_m),

      native_woodland_distance_m: Number(form.native_woodland_distance_m),
      public_road_distance_m: Number(form.public_road_distance_m),
      artificial_drain_distance_m: Number(form.artificial_drain_distance_m),

      peatland_status: form.peatland_status,

      notification_date: form.notification_date,
      previous_season_end: form.previous_season_end,

      sfrs_region: form.sfrs_region,
    };

    onSubmit(payload);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--paper)",
        border: "1px solid var(--paper-line)",
        borderRadius: "var(--radius)",
        padding: "16px",
        height: "100%",
        overflowY: "auto",
      }}
    >
      <Section title="Timing">
        <Field label="Burn date">
          <input style={inputStyle} type="date" value={form.burn_date} onChange={(e) => set("burn_date", e.target.value)} required />
        </Field>
        <Field label="Planned start time">
          <input style={inputStyle} type="time" value={form.planned_time} onChange={(e) => set("planned_time", e.target.value)} required />
        </Field>
        <Field label="Sunrise">
          <input style={inputStyle} type="time" value={form.sunrise_time} onChange={(e) => set("sunrise_time", e.target.value)} required />
        </Field>
        <Field label="Sunset">
          <input style={inputStyle} type="time" value={form.sunset_time} onChange={(e) => set("sunset_time", e.target.value)} required />
        </Field>
      </Section>

      <Section title="Field verification required" subtitle="No GIS source for these — must be checked on-site.">
        <Field label="Slope (degrees)">
          <input style={inputStyle} type="number" step="0.1" value={form.slope_degrees} onChange={(e) => set("slope_degrees", e.target.value)} />
        </Field>
        <Field label="Peatland status">
          <select style={inputStyle} value={form.peatland_status} onChange={(e) => set("peatland_status", e.target.value as PeatlandStatus)}>
            <option value="peatland">Peatland</option>
            <option value="not_peatland">Not peatland</option>
            <option value="uncertain">Uncertain</option>
          </select>
        </Field>
        <Field label="Distance to peat hag (m)">
          <input style={inputStyle} type="number" step="0.1" value={form.peat_hag_distance_m} onChange={(e) => set("peat_hag_distance_m", e.target.value)} />
        </Field>
        <Field label="Distance to artificial drain (m)">
          <input
            style={inputStyle}
            type="number"
            step="0.1"
            value={form.artificial_drain_distance_m}
            onChange={(e) => set("artificial_drain_distance_m", e.target.value)}
          />
        </Field>
      </Section>

      <Section title="Site survey" subtitle="Pre-filled from GIS proximity data — confirm before relying on it.">
        <Field label="Watercourse width (m)" hint={watercourseHint.text} hintTone={watercourseHint.tone}>
          <input style={inputStyle} type="number" step="0.1" value={form.watercourse_width_m} onChange={(e) => set("watercourse_width_m", e.target.value)} />
        </Field>
        <Field label="Distance to watercourse (m)">
          <input
            style={inputStyle}
            type="number"
            step="0.1"
            value={form.watercourse_distance_m}
            onChange={(e) => set("watercourse_distance_m", e.target.value)}
          />
        </Field>
        <Field label="Bare peat area (m²)" hint={bareHint.text} hintTone={bareHint.tone}>
          <input style={inputStyle} type="number" step="0.1" value={form.bare_peat_area_m2} onChange={(e) => set("bare_peat_area_m2", e.target.value)} />
        </Field>
        <Field label="Distance to bare peat (m)">
          <input style={inputStyle} type="number" step="0.1" value={form.bare_peat_distance_m} onChange={(e) => set("bare_peat_distance_m", e.target.value)} />
        </Field>
        <Field label="Distance to native woodland (m)" hint={woodlandHint.text} hintTone={woodlandHint.tone}>
          <input
            style={inputStyle}
            type="number"
            step="0.1"
            value={form.native_woodland_distance_m}
            onChange={(e) => set("native_woodland_distance_m", e.target.value)}
          />
        </Field>
        <Field label="Distance to public road (m)" hint={roadHint.text} hintTone={roadHint.tone}>
          <input style={inputStyle} type="number" step="0.1" value={form.public_road_distance_m} onChange={(e) => set("public_road_distance_m", e.target.value)} />
        </Field>
      </Section>

      <Section title="Notifications & contact">
        <Field label="Notification date">
          <input style={inputStyle} type="date" value={form.notification_date} onChange={(e) => set("notification_date", e.target.value)} required />
        </Field>
        <Field label="Previous season end date">
          <input style={inputStyle} type="date" value={form.previous_season_end} onChange={(e) => set("previous_season_end", e.target.value)} required />
        </Field>
        <Field label="SFRS region">
          <select style={inputStyle} value={form.sfrs_region} onChange={(e) => set("sfrs_region", e.target.value as SfrsRegion)}>
            <option value="north">North (Dundee)</option>
            <option value="east">East (Edinburgh)</option>
            <option value="west">West (Johnstone)</option>
            <option value="general">Unsure (general line)</option>
          </select>
        </Field>
      </Section>

      {notificationReminder && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            padding: "8px 10px",
            borderRadius: "var(--radius)",
            marginBottom: "16px",
            background: notificationReminder.onTime && notificationReminder.afterPrevSeason !== false ? "var(--pass-bg)" : "var(--warn-bg)",
            color: notificationReminder.onTime && notificationReminder.afterPrevSeason !== false ? "var(--pass)" : "var(--warn)",
          }}
        >
          {notificationReminder.onTime
            ? "✓ Notification date meets the 7-day rule."
            : `⚠ Landowners/occupiers within 1km must be notified by ${notificationReminder.latestAllowedISO} (7 days before burning).`}
          {notificationReminder.afterPrevSeason === false && " Also: notification date must fall after the previous season ended."}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          width: "100%",
          padding: "10px",
          background: submitting ? "var(--moor-500)" : "var(--moor-900)",
          color: "var(--paper)",
          border: "none",
          borderRadius: "var(--radius)",
          fontFamily: "var(--font-display)",
          fontWeight: 600,
          fontSize: "13px",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Running check…" : "Run compliance check"}
      </button>
    </form>
  );
}