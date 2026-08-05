import type { RawCheck, ReadinessStatus } from "./types";

export type StatusedCheck = {
  check: string;
  status: ReadinessStatus;
  message: string;
};

/**
 * Turns raw /evaluate check objects into a uniform {status, message} shape
 * for display. Narrowing is done by which fields are present.
 */
export function deriveStatus(raw: RawCheck): StatusedCheck {
  if ("in_season" in raw) {
    return raw.in_season
      ? { check: raw.check, status: "pass", message: "Burn date falls within the legal muirburn season." }
      : {
          check: raw.check,
          status: "fail",
          message: `Burn date is outside the legal season (season ends ${raw.season_end_used}).`,
        };
  }

  if ("earliest_permitted" in raw) {
    return raw.compliant
      ? { check: raw.check, status: "pass", message: "Planned time falls within permitted burning hours." }
      : {
          check: raw.check,
          status: "fail",
          message: `Planned time is outside permitted hours (${raw.earliest_permitted} – ${raw.latest_permitted}).`,
        };
  }

  if ("notify_radius_km" in raw) {
    return raw.compliant
      ? { check: raw.check, status: "pass", message: "Landowner/occupier notification timing is compliant." }
      : {
          check: raw.check,
          status: "fail",
          message: `Notify landowners/occupiers within ${raw.notify_radius_km}km by ${raw.latest_allowed_date} (at least ${raw.min_days_before_burn} days before the burn).`,
        };
  }

  if ("control_room" in raw) {
    // Informational only — not a pass/fail condition.
    return {
      check: raw.check,
      status: "pass",
      message: `Call ${raw.control_room} on ${raw.phone} before and after burning.`,
    };
  }

  return { check: (raw as RawCheck).check, status: "warning", message: "Unrecognised check — please review manually." };
}