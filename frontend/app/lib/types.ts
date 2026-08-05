// Mirrors the Pydantic models in main.py — keep these in sync with the backend.

export type GeoJSONPolygon = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: "Polygon";
    coordinates: number[][][];
  };
};

export type SfrsRegion = "north" | "east" | "west" | "general";

// -------------------------
// /evaluate request
// -------------------------

export type AssessmentRequest = {
  burn_date: string; // YYYY-MM-DD
  planned_time: string; // ISO datetime
  sunrise_time: string; // ISO datetime
  sunset_time: string; // ISO datetime

  notification_date: string; // YYYY-MM-DD
  previous_season_end: string; // YYYY-MM-DD

  sfrs_region: SfrsRegion;
};

// -------------------------
// Raw check shapes returned by /evaluate
// -------------------------

export type SeasonCheck = {
  check: "season";
  date: string;
  in_season: boolean;
  season_end_used: string;
};

export type BurnTimingCheck = {
  check: "burn_timing";
  earliest_permitted: string;
  latest_permitted: string;
  compliant: boolean;
};

export type LandownerNotificationCheck = {
  check: "landowner_notification";
  notify_radius_km: number;
  min_days_before_burn: number;
  latest_allowed_date: string;
  after_previous_season: boolean;
  compliant: boolean;
  further_info_deadline: string;
};

export type SfrsContactCheck = {
  check: "sfrs_contact";
  region: string;
  control_room: string;
  phone: string;
};

export type RawCheck =
  | SeasonCheck
  | BurnTimingCheck
  | LandownerNotificationCheck
  | SfrsContactCheck;

export type EvaluateResponse = {
  ruleset_version: string;
  last_verified: string;
  generated: string;
  checks: RawCheck[];
};

// -------------------------
// /detect
// -------------------------

export type FeatureAvailability =
  | { available: true; found: boolean; count?: number }
  | { available: false; error: string };

export type SlopeStatus = "prohibited" | "assessment_required" | "clear";

export type SlopeDetection =
  | {
      check: "slope";
      available: true;
      max_degrees: number;
      p95_degrees: number;
      mean_degrees: number;
      source: string;
      prohibited_degrees: number;
      assess_degrees: number;
      slope_status: SlopeStatus;
      advisory: string;
    }
  | { check: "slope"; available: false; error: string };

export type DetectResponse = {
  generated: string;
  detected_features: Record<string, FeatureAvailability>;
  slope: SlopeDetection;
};

// -------------------------
// /rules
// -------------------------

export type RulesResponse = {
  ruleset_version: string;
  last_verified: string;
  slope: {
    prohibited_degrees: number;
    assessment_required_degrees: number;
  };
  buffers_m: {
    peat_hag: number;
    bare_peat_large: number;
    native_woodland: number;
    public_road: number;
  };
  watercourse_buffers_m: {
    under_2m: number;
    "2_to_15m": number;
    over_15m: number;
  };
  best_practice: {
    distance_from_artificial_drain_m: number;
    distance_from_bare_peat_general_m: number;
  };
};

// -------------------------
// ReadinessStatus — still used by deriveStatus for icon/colour mapping
// -------------------------

export type ReadinessStatus = "pass" | "warning" | "fail" | "unknown";