import yaml
from pathlib import Path
from datetime import date

CONFIG_PATH = Path(__file__).parent / "muirburn_code_2026.yaml"

def load_rules() -> dict:
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)

def check_in_season(check_date: date, rules: dict) -> dict:
    season = rules["season"]

    # Determine which season block applies based on the date
    standard_start = date(2026, 9, 15)

    if check_date < standard_start:
        block = season["transition_25_26"]
        start = date.fromisoformat(block["start"])
        end = date.fromisoformat(block["end"])
        in_season = start <= check_date <= end
    else:
        month_day = (check_date.month, check_date.day)
        start_md = tuple(int(x) for x in season["standard"]["start_month_day"].split("-"))
        end_md = tuple(int(x) for x in season["standard"]["end_month_day"].split("-"))
        in_season = month_day >= start_md or month_day <= end_md

    return {
        "check": "season",
        "date": check_date.isoformat(),
        "in_season": in_season,
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
        "slope_status": slope_status
    }