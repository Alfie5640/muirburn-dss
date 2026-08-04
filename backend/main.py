from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import date, datetime, UTC
from pydantic import BaseModel

from rules.checks import (
    load_rules,
    check_in_season,
    check_slope,
    check_burn_timing,
    check_buffer,
    check_bare_peat_buffer,
    check_watercourse_buffer,
    check_landowner_notification,
    lookup_sfrs_region,
    fetch_features_for_check,
    check_peatland_status,
    summarise_features
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

RULES = load_rules()


@app.get("/health")
def health():
    return {"status": "ok"}


# -------------------------
# Environmental detection
# -------------------------

class FeatureDetectionRequest(BaseModel):
    polygon: dict


@app.post("/detect")
def detect_features(req: FeatureDetectionRequest):

    raw_features = fetch_features_for_check(
        req.polygon,
        RULES
    )

    detected_features = summarise_features(raw_features)

    return {
        "generated": datetime.now(UTC).isoformat(),
        "detected_features": detected_features
    }


# -------------------------
# Compliance evaluation
# -------------------------

class AssessmentRequest(BaseModel):

    burn_date: date

    planned_time: datetime
    sunrise_time: datetime
    sunset_time: datetime

    slope_degrees: float

    watercourse_width_m: float
    watercourse_distance_m: float

    peat_hag_distance_m: float

    bare_peat_area_m2: float
    bare_peat_distance_m: float

    native_woodland_distance_m: float
    public_road_distance_m: float
    artificial_drain_distance_m: float

    peatland_status: str

    notification_date: date
    previous_season_end: date

    sfrs_region: str


@app.post("/evaluate")
def evaluate(req: AssessmentRequest):

    checks = [
        check_in_season(req.burn_date, RULES),
        check_slope(req.slope_degrees,RULES),
        check_burn_timing(req.planned_time,req.sunrise_time,req.sunset_time,RULES),
        check_peatland_status(req.peatland_status,RULES),
        check_buffer("peat_hag",RULES["buffers_m"]["peat_hag"],req.peat_hag_distance_m,"should_not"),
        check_bare_peat_buffer(req.bare_peat_area_m2,req.bare_peat_distance_m,RULES),
        check_buffer("native_woodland",RULES["buffers_m"]["native_woodland"],req.native_woodland_distance_m,"best_practice"),
        check_buffer("public_road",RULES["buffers_m"]["public_road"],req.public_road_distance_m,"should_not"),
        check_buffer("artificial_drain",RULES["best_practice"]["distance_from_artificial_drain_m"],req.artificial_drain_distance_m,"best_practice"),
        check_watercourse_buffer(req.watercourse_width_m,req.watercourse_distance_m,RULES),
        check_landowner_notification(req.notification_date,req.burn_date,req.previous_season_end,RULES),
        lookup_sfrs_region(req.sfrs_region,RULES),
    ]

    return {
        "ruleset_version": RULES["ruleset_version"],
        "last_verified": RULES["last_verified"],
        "generated": datetime.now(UTC).isoformat(),
        "checks": checks
    }


# -------------------------
# Burn readiness
# -------------------------

class BurnReadinessRequest(BaseModel):
    checks: list[dict]


@app.post("/burn-readiness")
def burn_readiness(req: BurnReadinessRequest):

    actions = []

    for check in req.checks:

        if check["status"] == "fail":
            actions.append({"priority": "required","action": check["message"]})

        elif check["status"] == "warning":
            actions.append({"priority": "recommended","action": check["message"]})


    return {
        "ready": len(
            [
                action
                for action in actions
                if action["priority"] == "required"
            ]
        ) == 0,

        "actions": actions,

        "generated": datetime.now(UTC).isoformat()
    }