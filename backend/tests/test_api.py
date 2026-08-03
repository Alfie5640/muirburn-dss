from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_detect_endpoint():
    payload = {
        "polygon": {
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [-4.5000, 56.2500],
                        [-4.4900, 56.2500],
                        [-4.4900, 56.2600],
                        [-4.5000, 56.2600],
                        [-4.5000, 56.2500],
                    ]
                ],
            },
        }
    }

    response = client.post("/detect", json=payload)

    assert response.status_code == 200

    data = response.json()

    assert "generated" in data
    assert "detected_features" in data

    features = data["detected_features"]

    assert "roads" in features
    assert "watercourses" in features
    assert "native_woodland" in features
    assert "bare_peat" in features

    assert "coordinates" not in str(features)


def test_evaluate_endpoint():
    payload = {
        "burn_date": "2026-10-20",

        "planned_time": "2026-10-20T12:00:00",
        "sunrise_time": "2026-10-20T07:30:00",
        "sunset_time": "2026-10-20T18:00:00",

        "slope_degrees": 30,

        "watercourse_width_m": 8,
        "watercourse_distance_m": 20,

        "peat_hag_distance_m": 40,

        "bare_peat_area_m2": 10,
        "bare_peat_distance_m": 40,

        "native_woodland_distance_m": 15,
        "public_road_distance_m": 50,
        "artificial_drain_distance_m": 40,

        "peatland_status": "confirmed",

        "notification_date": "2026-10-01",
        "previous_season_end": "2026-03-31",

        "sfrs_region": "west",
    }

    response = client.post("/evaluate", json=payload)

    assert response.status_code == 200

    data = response.json()

    assert data["ruleset_version"] == "muirburn_code_2026"
    assert "last_verified" in data
    assert "generated" in data

    checks = data["checks"]

    assert len(checks) > 0

    names = [check["check"] for check in checks]

    assert "season" in names
    assert "slope" in names
    assert "watercourse_buffer" in names
    assert "landowner_notification" in names


def test_burn_readiness_endpoint():
    payload = {
        "checks": [
            {
                "check": "season",
                "status": "pass",
                "message": "Burn date is within permitted season"
            },
            {
                "check": "peatland",
                "status": "warning",
                "message": "Peat survey required before burning"
            },
            {
                "check": "landowner_notification",
                "status": "fail",
                "message": "Landowner notification required"
            }
        ]
    }

    response = client.post("/burn-readiness", json=payload)

    assert response.status_code == 200

    data = response.json()

    assert "ready" in data
    assert "actions" in data
    assert "generated" in data

    assert data["ready"] is False

    actions = data["actions"]

    assert len(actions) == 2

    priorities = [
        action["priority"]
        for action in actions
    ]

    assert "required" in priorities
    assert "recommended" in priorities