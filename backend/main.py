from fastapi import FastAPI
from datetime import date
from rules.checks import load_rules, check_in_season

app = FastAPI()
rules = load_rules()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/season")
def season_check(check_date: date):
    return check_in_season(check_date, rules)