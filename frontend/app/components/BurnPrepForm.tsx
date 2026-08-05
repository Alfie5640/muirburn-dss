"use client";

import { useMemo, useState } from "react";
import type { SfrsRegion } from "../lib/types";

export type TimingData = {
  burn_date: string;
  planned_time: string;
  sunrise_time: string;
  sunset_time: string;
  notification_date: string;
  previous_season_end: string;
  sfrs_region: SfrsRegion;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export const initialTimingData: TimingData = {
  burn_date: todayISO(),
  planned_time: "12:00",
  sunrise_time: "07:30",
  sunset_time: "18:00",
  notification_date: todayISO(),
  previous_season_end: "",
  sfrs_region: "general",
};

type BurnPrepFormProps = {
  submitting: boolean;
  onSubmit: (payload: TimingData) => void;
};

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

export default function BurnPrepForm({ submitting, onSubmit }: BurnPrepFormProps) {
  const [form, setForm] = useState<TimingData>(initialTimingData);

  function set<K extends keyof TimingData>(key: K, value: TimingData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const notificationReminder = useMemo(() => {
    if (!form.burn_date || !form.notification_date) return null;
    const burnDate = new Date(form.burn_date);
    const latestAllowed = new Date(burnDate);
    latestAllowed.setDate(latestAllowed.getDate() - 7);
    const notifyDate = new Date(form.notification_date);
    const onTime = notifyDate <= latestAllowed;
    const afterPrevSeason = form.previous_season_end ? notifyDate > new Date(form.previous_season_end) : null;
    return { onTime, afterPrevSeason, latestAllowedISO: latestAllowed.toISOString().slice(0, 10) };
  }, [form.burn_date, form.notification_date, form.previous_season_end]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.previous_season_end) {
      alert("Please enter the previous season's end date — it's needed for the notification-timing check.");
      return;
    }
    onSubmit(form);
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--paper)",
        border: "1px solid var(--paper-line)",
        borderRadius: "var(--radius)",
        padding: "16px",
      }}
    >
      <h3 style={{ margin: "0 0 10px", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "14px", color: "var(--moor-900)" }}>
        Notifications & getting ready to burn
      </h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
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
      </div>

      {notificationReminder && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            padding: "8px 10px",
            borderRadius: "var(--radius)",
            marginBottom: "12px",
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