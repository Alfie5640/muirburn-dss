from fastapi import FastAPI
from datetime import date, datetime
from pydantic import BaseModel
from rules.checks import (
    load_rules,
    check_in_season,
    check_slope,
    check_burn_timing,
    check_fixed_buffer,
    check_bare_peat_buffer,
    check_watercourse_buffer,
    check_landowner_notification,
    lookup_sfrs_region,
)

app = FastAPI()
RULES = load_rules()

class CheckRequest(BaseModel):
    burn_date: date
    planned_time: datetime
    sunrise_time: datetime
    sunset_time: datetime
    slope_degrees: float
    watercourse_width_m: float
    bare_peat_area_m2: float
    notification_date: date
    previous_season_end: date
    sfrs_region: str  # user selected for v1
    polygon: dict | None = None       # placeholder 
    feature_data: dict | None = None  # placeholder 

@app.post("/check")
def run_check(req: CheckRequest):
    results = [
        check_in_season(req.burn_date, RULES),
        check_slope(req.slope_degrees, RULES),
        check_burn_timing(req.planned_time, req.sunrise_time, req.sunset_time, RULES),
        check_fixed_buffer(req.polygon, req.feature_data, "peat_hag", RULES["buffers_m"]["peat_hag"], "should_not"),
        check_bare_peat_buffer(req.polygon, req.feature_data, req.bare_peat_area_m2, RULES),
        check_fixed_buffer(req.polygon, req.feature_data, "native_woodland", RULES["best_practice"].get("distance_from_native_woodland_m", RULES["buffers_m"]["native_woodland"]), "best_practice"),
        check_fixed_buffer(req.polygon, req.feature_data, "public_road", RULES["buffers_m"]["public_road"], "should_not"),
        check_fixed_buffer(req.polygon, req.feature_data, "artificial_drain", RULES["best_practice"]["distance_from_artificial_drain_m"], "best_practice"),
        check_watercourse_buffer(req.watercourse_width_m, req.polygon, RULES, req.feature_data),
        check_landowner_notification(req.notification_date, req.burn_date, req.previous_season_end, RULES),
        lookup_sfrs_region(req.sfrs_region, RULES),
    ]

    return {
        "ruleset_version": RULES["ruleset_version"],
        "last_verified": RULES["last_verified"],
        "generated": datetime.utcnow().isoformat(),
        "checks": results,
    }

@app.get("/health")
def health():
    return {"status": "ok"}
