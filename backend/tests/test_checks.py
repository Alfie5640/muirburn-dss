from datetime import date
from rules.checks import load_rules, check_in_season

rules = load_rules()

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