# checks.py
import yaml
from pathlib import Path
from datetime import date, datetime, timedelta

CONFIG_PATH = Path(__file__).parent / "muirburn_code_2026.yaml"


def load_rules() -> dict:
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)


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


# TODO:find real geometry dataset for my use case
def calc_distance(polygon, feature_data) -> float:
    return 0.0


def check_fixed_buffer(polygon, feature_data, buffer_key: str, buffer_value: float, severity: str) -> dict:
    dist_from = calc_distance(polygon, feature_data)
    compliant = dist_from > buffer_value
    return {
        "check": f"{buffer_key}_buffer",
        "severity": severity,
        "buffer_required_m": buffer_value,
        "distance_m": dist_from,
        "compliant": compliant,
    }


def classify_bare_peat_area(area_m2: float, rules: dict) -> str:
    threshold = rules["should_not"]["bare_peat_large_m2"]
    return "large" if area_m2 > threshold else "general"


def check_bare_peat_buffer(polygon, feature_data, area_m2: float, rules: dict) -> dict:
    classification = classify_bare_peat_area(area_m2, rules)
    if classification == "large":
        return check_fixed_buffer(
            polygon, feature_data, "bare_peat_large",
            rules["buffers_m"]["bare_peat_large"], "should_not",
        )
    else:
        return check_fixed_buffer(
            polygon, feature_data, "bare_peat_general",
            rules["best_practice"]["distance_from_bare_peat_general_m"], "best_practice",
        )


def get_watercourse_buffer_required(watercourse_width: float, rules: dict) -> float:
    buffers = rules["watercourse_buffers_m"]
    if watercourse_width > 15:
        return buffers["over_15m"]
    elif watercourse_width > 2:
        return buffers["2_to_15m"]
    else:
        return buffers["under_2m"]


def check_watercourse_buffer(watercourse_width: float, polygon, rules: dict, feature_data) -> dict:
    buffer = get_watercourse_buffer_required(watercourse_width, rules)
    dist_from_burn = calc_distance(polygon, feature_data)
    compliant = dist_from_burn >= buffer
    return {
        "check": "water_buffer",
        "buffer_required_m": buffer,
        "distance_m": dist_from_burn,
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