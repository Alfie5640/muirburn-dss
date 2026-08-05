import yaml
from pathlib import Path
from datetime import date, datetime, timedelta

from geodata import query_os_open_roads, query_os_open_rivers, query_nwss, query_peat_layer

CONFIG_PATH = Path(__file__).parent / "muirburn_code_2026.yaml"

def load_rules() -> dict:
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)

def summarise_features(features: dict) -> dict:
    summary = {}

    for name, data in features.items():
        if isinstance(data, dict) and data.get("status") == "unavailable":
            summary[name] = {
                "available": False,
                "error": data["error"]
            }
            continue

        if isinstance(data, dict) and "features" in data:
            summary[name] = {
                "available": True,
                "found": len(data["features"]) > 0,
                "count": len(data["features"])
            }
        else:
            summary[name] = {
                "available": True,
                "found": False
            }

    return summary

def get_query_bbox(polygon, margin_m: float = 50) -> tuple:
    coords = polygon["geometry"]["coordinates"][0]
    lons = [pt[0] for pt in coords]
    lats = [pt[1] for pt in coords]
    minx, maxx = min(lons), max(lons)
    miny, maxy = min(lats), max(lats)
    pad_deg = margin_m / 111_000
    return (minx - pad_deg, miny - pad_deg, maxx + pad_deg, maxy + pad_deg)

def fetch_features_for_check(polygon, rules) -> dict:
    bbox = get_query_bbox(polygon)

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

###############
## CHECK COMPLIANCE WITH RULES
###############

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

def evaluate_slope(slope_stats: dict, rules: dict) -> dict:
    slope = rules["slope"]
    prohibited = slope["prohibited_degrees"]
    assess = slope["assessment_required_degrees"]
    decision_value = slope_stats["p95_degrees"]

    if decision_value > prohibited:
        slope_status = "prohibited"
    elif decision_value > assess:
        slope_status = "assessment_required"
    else:
        slope_status = "clear"

    return {
        "check": "slope",
        "available": True,
        "max_degrees": slope_stats["max_degrees"],
        "p95_degrees": slope_stats["p95_degrees"],
        "mean_degrees": slope_stats["mean_degrees"],
        "source": slope_stats["source"],
        "prohibited_degrees": prohibited,
        "assess_degrees": assess,
        "slope_status": slope_status,
        "advisory": "Based on Copernicus DEM GLO-30 (30m resolution) — verify on-site, "
                    "especially near ridges, gullies or scree where DEM accuracy is lower.",
    }