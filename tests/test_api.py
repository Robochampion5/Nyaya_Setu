"""
Integration Tests for FastAPI Endpoints
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app


@pytest.fixture(scope="module")
def client():
    """Create test client with active lifespan context."""
    with TestClient(app) as c:
        yield c


def test_health_endpoint(client):
    """Verify /health returns healthy status and model information."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["model_loaded"] is True
    assert data["version"] == "1.0.0"


def test_score_case_endpoint(client):
    """Verify POST /score_case returns valid case scoring response."""
    payload = {
        "case_id": "API-TEST-001",
        "state_code": 1,
        "dist_code": 1,
        "court_no": 1,
        "type_name_val": "ni act (cheque bounce)",
        "purpose_name_val": "appearance",
        "case_age_days": 150.0,
        "first_listing_delay": 20.0,
        "statutory_eligible": 1,
        "female_petitioner_clean": 0,
        "female_defendant_clean": 0,
        "has_female_adv_pet": 1,
        "has_female_adv_def": 1,
    }
    response = client.post("/score_case", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == "API-TEST-001"
    assert "suitability_score" in data
    assert data["recommendation"] in ["Lok Adalat", "Mediation", "Trial"]
    assert "top_reasons" in data


def test_score_batch_endpoint(client):
    """Verify POST /score_batch returns summary and array of scored cases."""
    payload = {
        "cases": [
            {
                "case_id": "BATCH-01",
                "type_name_val": "s.c.c.",
                "purpose_name_val": "appearance",
                "statutory_eligible": 1,
            },
            {
                "case_id": "BATCH-02",
                "type_name_val": "murder u/s 302 ipc",
                "purpose_name_val": "hearing",
                "statutory_eligible": 0,
            }
        ]
    }
    response = client.post("/score_batch", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert data["summary"]["total_cases"] == 2
    assert data["summary"]["excluded_count"] == 1
    assert len(data["results"]) == 2


def test_reference_data_endpoint(client):
    """Verify GET /reference_data returns states, districts, types and presets."""
    response = client.get("/reference_data")
    assert response.status_code == 200
    data = response.json()
    assert len(data["states"]) > 0
    assert len(data["common_case_types"]) > 0
    assert len(data["sample_presets"]) > 0


def test_invalid_input_validation(client):
    """Verify out-of-range input returns 422 Unprocessable Entity."""
    payload = {
        "state_code": 999,  # ge=1, le=50
    }
    response = client.post("/score_case", json=payload)
    assert response.status_code == 422

