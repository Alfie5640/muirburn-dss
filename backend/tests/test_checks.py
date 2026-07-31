from datetime import date, datetime, timedelta
from rules.checks import (
    load_rules,
    check_in_season,
    check_slope,
    check_burn_timing,
    get_watercourse_buffer_required,
    check_watercourse_buffer,
)

rules = load_rules()

#############
# CHECK SEASON
#############

def test_transition_season_start():
    assert check_in_season(date(2025, 10, 1), rules)["in_season"] is True

def test_transition_season_before_start():
    assert check_in_season(date(2025, 9, 30), rules)["in_season"] is False

def test_standard_season_wrap_december():
    assert check_in_season(date(2026, 12, 25), rules)["in_season"] is True

def test_standard_season_out_of_season_july():
    assert check_in_season(date(2026, 7, 28), rules)["in_season"] is False

def test_standard_season_boundary_end():
    assert check_in_season(date(2027, 3, 31), rules)["in_season"] is True

def test_standard_season_boundary_day_after_end():
    assert check_in_season(date(2027, 4, 1), rules)["in_season"] is False

#############
# CHECK SLOPE
#############

def test_prohibited_slope():
    assert check_slope(50, rules)["slope_status"] == "prohibited"

def test_assesment_required_slope():
    assert check_slope(30, rules)["slope_status"] == "assessment_required"

def test_clear_slope():
    assert check_slope(10, rules)["slope_status"] == "clear"

def test_prohibited_boundary():
    assert check_slope(45, rules)["slope_status"] == "assessment_required"

def test_assessment_boundary():
    assert check_slope(27, rules)["slope_status"] == "clear"

#############
# CHECK BURN TIMING
#############

def test_burn_timing_within_daylight():
    sunrise = datetime(2026, 10, 20, 7, 30)
    sunset = datetime(2026, 10, 20, 18, 0)
    planned = datetime(2026, 10, 20, 12, 0)
    assert check_burn_timing(planned, sunrise, sunset, rules)["compliant"] is True

def test_burn_timing_at_sunset_plus_offset_boundary():
    sunrise = datetime(2026, 10, 20, 7, 30)
    sunset = datetime(2026, 10, 20, 18, 0)
    planned = sunset + timedelta(hours=1)  # exactly at latest permitted, inclusive
    assert check_burn_timing(planned, sunrise, sunset, rules)["compliant"] is True

def test_burn_timing_after_sunset_offset():
    sunrise = datetime(2026, 10, 20, 7, 30)
    sunset = datetime(2026, 10, 20, 18, 0)
    planned = sunset + timedelta(hours=1, minutes=1)
    assert check_burn_timing(planned, sunrise, sunset, rules)["compliant"] is False

def test_burn_timing_at_sunrise_minus_offset_boundary():
    sunrise = datetime(2026, 10, 20, 7, 30)
    sunset = datetime(2026, 10, 20, 18, 0)
    planned = sunrise - timedelta(hours=1)  # exactly at earliest permitted, inclusive
    assert check_burn_timing(planned, sunrise, sunset, rules)["compliant"] is True

def test_burn_timing_before_sunrise_offset():
    sunrise = datetime(2026, 10, 20, 7, 30)
    sunset = datetime(2026, 10, 20, 18, 0)
    planned = sunrise - timedelta(hours=1, minutes=1)
    assert check_burn_timing(planned, sunrise, sunset, rules)["compliant"] is False

############
# WATERCOURSE BUFFER 
############

def test_watercourse_under_2m():
    assert get_watercourse_buffer_required(1.5, rules) == 10

def test_watercourse_2_to_15m_boundary_at_2():
    # width exactly 2m — the `>` comparison means this falls into the "under_2m" bucket
    assert get_watercourse_buffer_required(2, rules) == 10

def test_watercourse_2_to_15m():
    assert get_watercourse_buffer_required(8, rules) == 15

def test_watercourse_over_15m_boundary_at_15():
    # width exactly 15m — falls into the "2_to_15m" bucket, not "over_15m"
    assert get_watercourse_buffer_required(15, rules) == 15

def test_watercourse_over_15m():
    assert get_watercourse_buffer_required(20, rules) == 30

############
# WATERCOURSE BUFFER —

def test_watercourse_compliance_stubbed_pending_geometry():
    # calc_distance is not yet implemented and always returns 0.0,
    # so compliant will always be False here until real geometry lands.
    # This test exists to document that fact, not to validate compliance logic.
    result = check_watercourse_buffer(8, polygon=None, rules=rules, feature_data=None)
    assert result["buffer_required"] == 15
    assert result["compliant"] is False