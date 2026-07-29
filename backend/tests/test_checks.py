from datetime import date
from rules.checks import load_rules, check_in_season, check_slope

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