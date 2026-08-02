import yaml
from pathlib import Path
from datetime import date, datetime, timedelta

from geodata import query_os_open_roads, query_os_open_rivers, query_nwss, query_peat_layer

CONFIG_PATH = Path(__file__).parent / "muirburn_code_2026.yaml"


def load_rules() -> dict:
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)

def get_max_relevant_buffer(rules):
    candidates = [
        *rules["buffers_m"].values(),
        *rules["watercourse_buffers_m"].values(),
        *rules["best_practice"].values(),
    ]
    return max(candidates)

def get_query_bbox(polygon, max_buffer_m: float, margin_m: float = 50) -> tuple:
    coords = polygon["geometry"]["coordinates"][0]
    lons = [pt[0] for pt in coords]
    lats = [pt[1] for pt in coords]
    minx, maxx = min(lons), max(lons)
    miny, maxy = min(lats), max(lats)
    pad_deg = (max_buffer_m + margin_m) / 111_000
    return (minx - pad_deg, miny - pad_deg, maxx + pad_deg, maxy + pad_deg)

def fetch_features_for_check(polygon, rules) -> dict:
    max_buffer = get_max_relevant_buffer(rules)
    bbox = get_query_bbox(polygon, max_buffer)

    sources = {
        "roads": query_os_open_roads,
        "watercourses": query_os_open_rivers,
        "native_woodland": query_nwss,
        "bare_peat": query_peat_layer,
    }

    results = {}
    for name, fn in sources.items():
        try:
            results[name] = fn(bbox)
        except Exception as e:
            results[name] = {"status": "unavailable", "error": str(e)}
    return results

def check_in_season(check_date: date, rules: dict) -> dict:
    season = rules["season"]
    standard_start = date(2026, 9, 15)

    if check_date < standard_start:
        block = season["transition_25_26"]
        start = date.fromisoformat(block["start"])
        end = date.fromisoformat(block["end"])
        in_season = start <= check_date <= end
        season_end_used = end
    else:
        month_day = (check_date.month, check_date.day)
        start_md = tuple(int(x) for x in season["standard"]["start_month_day"].split("-"))
        end_md = tuple(int(x) for x in season["standard"]["end_month_day"].split("-"))
        in_season = month_day >= start_md or month_day <= end_md
        end_md_full = date(check_date.year if check_date.month <= end_md[0] else check_date.year + 1, *end_md)
        season_end_used = end_md_full

    return {
        "check": "season",
        "date": check_date.isoformat(),
        "in_season": in_season,
        "season_end_used": season_end_used.isoformat(),
    }

def check_peatland_status(status: str, rules: dict) -> dict:
    effective_status = "peatland" if status == "uncertain" else status
    return {
        "check": "peatland_status",
        "reported_status": status,
        "effective_status": effective_status,
        "advisory": "Status must be confirmed via NatureScot's interactive peat depth map, "
                    "not this tool. 'Uncertain' with no survey data defaults to peatland",
    }

def check_slope(slope_to_check: float, rules: dict) -> dict:
    slope = rules["slope"]
    slope_prohib = slope["prohibited_degrees"]
    slope_assess = slope["assessment_required_degrees"]

    if slope_to_check > slope_prohib:
        slope_status = "prohibited"
    elif slope_to_check > slope_assess:
        slope_status = "assessment_required"
    else:
        slope_status = "clear"

    return {
        "check": "slope",
        "slope": slope_to_check,
        "prohibited_degrees": slope_prohib,
        "assess_degrees": slope_assess,
        "slope_status": slope_status,
    }


def check_burn_timing(planned_time: datetime, sunrise_time: datetime, sunset_time: datetime, rules: dict) -> dict:
    timing = rules["timing"]
    earliest = sunrise_time - timedelta(hours=timing["no_burn_before_sunrise_hours"])
    latest = sunset_time + timedelta(hours=timing["no_burn_after_sunset_hours"])
    compliant = earliest <= planned_time <= latest

    return {
        "check": "burn_timing",
        "earliest_permitted": earliest.isoformat(),
        "latest_permitted": latest.isoformat(),
        "compliant": compliant,
    }

def check_buffer(feature_key: str, buffer_required_m: float, distance_confirmed_m: float, severity: str, distance_source: str = "user_confirmed") -> dict:
    compliant = distance_confirmed_m > buffer_required_m
    return {
        "check": f"{feature_key}_buffer",
        "severity": severity,
        "buffer_required_m": buffer_required_m,
        "distance_m": distance_confirmed_m,
        "distance_source": distance_source,
        "compliant": compliant,
        "advisory": "Distance must be confirmed on-site or via accurate survey "
                    "Automated GIS estimates are not yet verified accurate enough for this buffer tolerance",
    }


def classify_bare_peat_area(area_m2: float, rules: dict) -> str:
    threshold = rules["should_not"]["bare_peat_large_m2"]
    return "large" if area_m2 > threshold else "general"


def check_bare_peat_buffer(area_m2: float, distance_confirmed_m: float, rules: dict) -> dict:
    classification = classify_bare_peat_area(area_m2, rules)
    if classification == "large":
        return check_buffer("bare_peat_large", rules["buffers_m"]["bare_peat_large"],
                             distance_confirmed_m, "should_not")
    else:
        return check_buffer("bare_peat_general", rules["best_practice"]["distance_from_bare_peat_general_m"],
                             distance_confirmed_m, "best_practice")


def get_watercourse_buffer_required(watercourse_width: float, rules: dict) -> float:
    buffers = rules["watercourse_buffers_m"]
    if watercourse_width > 15:
        return buffers["over_15m"]
    elif watercourse_width > 2:
        return buffers["2_to_15m"]
    else:
        return buffers["under_2m"]


def check_watercourse_buffer(watercourse_width_m: float, distance_confirmed_m: float, rules: dict, width_source: str = "user_confirmed") -> dict:
    buffer = get_watercourse_buffer_required(watercourse_width_m, rules)
    result = check_buffer("watercourse", buffer, distance_confirmed_m, "should_not")
    result["width_source"] = width_source
    return result


def check_landowner_notification(notification_date: date, burn_start_date: date, previous_season_end: date, rules: dict) -> dict:
    notif = rules["notifications"]
    min_days = notif["min_days_before_burn"]
    radius_km = notif["notify_radius_km"]

    latest_allowed = burn_start_date - timedelta(days=min_days)
    after_previous_season = notification_date > previous_season_end

    compliant = after_previous_season and notification_date <= latest_allowed

    return {
        "check": "landowner_notification",
        "notify_radius_km": radius_km,
        "min_days_before_burn": min_days,
        "latest_allowed_date": latest_allowed.isoformat(),
        "after_previous_season": after_previous_season,
        "compliant": compliant,
        "further_info_deadline": notif["further_info_deadline"],
    }


def lookup_sfrs_region(region_key: str, rules: dict) -> dict:
    regions = rules["sfrs_regions"]
    region = regions.get(region_key, regions["general"])
    return {
        "check": "sfrs_contact",
        "region": region_key if region_key in regions else "general",
        "control_room": region["name"],
        "phone": region["phone"],
    }