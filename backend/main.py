from fastapi import FastAPI
import datetime
import yaml

app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/season")
def check_in_season() -> bool:
    currTime = datetime.datetime.now()
    with open('rules/muirburn_code_2026.yaml') as f:
        data = yaml.load(f, Loader=yaml.SafeLoader)

    start_of_season = data["season"]["standard"]["start_month_day"] #09-15
    end_of_season = data["season"]["standard"]["end_month_day"] #03-31
    return True