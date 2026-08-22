"""
Unit Tests for Inference and Explainability Engine
"""

import pytest
from backend.app.schemas.case import CaseInput, BatchScoreRequest
from backend.app.services.inference import InferenceService
from backend.app.services.model_loader import model_manager


@pytest.fixture(scope="module", autouse=True)
def setup_model():
    """Ensure artifacts are loaded."""
    model_manager.load_artifacts()


def test_score_single_eligible_case():
    """Test scoring an eligible case with ML ranking and SHAP factors."""
    case = CaseInput(
        case_id="TEST-CNR-001",
        state_code=1,
        dist_code=1,
        court_no=1,
        type_name_val="ni act (cheque bounce)",
        purpose_name_val="appearance",
        case_age_days=200.0,
        first_listing_delay=30.0,
        statutory_eligible=1,
        female_petitioner_clean=0,
        female_defendant_clean=0,
        has_female_adv_pet=1,
        has_female_adv_def=1,
    )
    result = InferenceService.score_single_case(case)
    
    assert result.case_id == "TEST-CNR-001"
    assert 0.0 <= result.suitability_score <= 100.0
    assert result.recommendation in ["Lok Adalat", "Mediation", "Trial"]
    assert result.statutory_status == "Eligible"
    assert result.is_statutory_eligible is True
    assert len(result.top_reasons) > 0
    assert result.execution_time_ms >= 0


def test_score_single_excluded_case():
    """Test that an excluded case skips ML inference and returns Trial Only with 0% suitability."""
    case = CaseInput(
        case_id="TEST-EXCLUDED-002",
        state_code=1,
        dist_code=1,
        court_no=1,
        type_name_val="bail appln cbi",
        purpose_name_val="hearing",
        statutory_eligible=0,
    )
    result = InferenceService.score_single_case(case)
    
    assert result.case_id == "TEST-EXCLUDED-002"
    assert result.suitability_score == 0.0
    assert result.recommendation == "Trial"
    assert result.statutory_status == "Excluded (Trial Only)"
    assert result.is_statutory_eligible is False
    assert len(result.top_reasons) > 0


def test_batch_scoring():
    """Test batch screening with summary metrics."""
    cases = [
        CaseInput(case_id="C1", type_name_val="ni act", statutory_eligible=1),
        CaseInput(case_id="C2", type_name_val="s.c.c.", statutory_eligible=1),
        CaseInput(case_id="C3", type_name_val="bail appln", statutory_eligible=0),
    ]
    batch_req = BatchScoreRequest(cases=cases)
    batch_res = InferenceService.score_batch(batch_req)
    
    assert batch_res.summary.total_cases == 3
    assert batch_res.summary.excluded_count == 1
    assert batch_res.summary.eligible_count == 2
    assert len(batch_res.results) == 3
    assert batch_res.summary.estimated_court_hours_saved >= 0

