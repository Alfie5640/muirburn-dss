from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import date, datetime, UTC
from pydantic import BaseModel

from rules.checks import (
    load_rules,
    check_in_season,
    check_burn_timing,
    check_landowner_notification,
    lookup_sfrs_region,
    fetch_features_for_check,
    summarise_features,
    evaluate_slope,
)
from geodata import query_dem_slope

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


@app.get("/rules")
def get_rules():
    return {
        "ruleset_version": RULES["ruleset_version"],
        "last_verified": RULES["last_verified"],
        "slope": RULES["slope"],
        "buffers_m": RULES["buffers_m"],
        "watercourse_buffers_m": RULES["watercourse_buffers_m"],
        "best_practice": RULES["best_practice"],
    }


class FeatureDetectionRequest(BaseModel):
    polygon: dict


@app.post("/detect")
def detect_features(req: FeatureDetectionRequest):

    raw_features = fetch_features_for_check(req.polygon, RULES)
    detected_features = summarise_features(raw_features)

    try:
        slope_stats = query_dem_slope(req.polygon)
        slope = evaluate_slope(slope_stats, RULES)
    except Exception as e:
        slope = {"check": "slope", "available": False, "error": str(e)}

    return {
        "generated": datetime.now(UTC).isoformat(),
        "detected_features": detected_features,
        "slope": slope,
    }


class AssessmentRequest(BaseModel):
    burn_date: date
    planned_time: datetime
    sunrise_time: datetime
    sunset_time: datetime
    notification_date: date
    previous_season_end: date
    sfrs_region: str


@app.post("/evaluate")
def evaluate(req: AssessmentRequest):
    checks = [
        check_in_season(req.burn_date, RULES),
        check_burn_timing(req.planned_time, req.sunrise_time, req.sunset_time, RULES),
        check_landowner_notification(req.notification_date, req.burn_date, req.previous_season_end, RULES),
        lookup_sfrs_region(req.sfrs_region, RULES),
    ]

    return {
        "ruleset_version": RULES["ruleset_version"],
        "last_verified": RULES["last_verified"],
        "generated": datetime.now(UTC).isoformat(),
        "checks": checks
    }