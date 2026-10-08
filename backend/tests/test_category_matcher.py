import json
import pytest
from backend.app.services.category_matcher import CategoryMatcher, CONFIDENCE_THRESHOLD
from backend.app.services.inference import InferenceService
from backend.app.schemas.case import CaseInput


@pytest.fixture(scope="module")
def initialized_matcher():
    from backend.app.services.model_loader import model_manager
    model_manager.load_artifacts()
    assert model_manager.category_matcher.is_ready is True
    return model_manager.category_matcher


def test_matcher_exact_known(initialized_matcher):
    """Direct vocabulary entry returns exact match, 1.0 confidence, known=True."""
    cat, freq, sim, is_known = initialized_matcher.match("s.c.c.")
    assert cat == "s.c.c."
    assert sim == 1.0
    assert is_known is True
    assert freq > 0


def test_matcher_semantic_motor_accident(initialized_matcher):
    """Free text motor vehicle accident maps semantically to motor accident claim."""
    cat, freq, sim, is_known = initialized_matcher.match("road vehicle traffic crash injury claim")
    assert "motor accident" in cat or "mact" in cat or "mcop" in cat
    assert sim >= 0.50
    assert is_known is False


def test_matcher_cheque_bounce_alias(initialized_matcher):
    """Colloquial 'cheque bounce' maps to NI Act / 138 entries."""
    cat, freq, sim, is_known = initialized_matcher.match("cheque bounce")
    assert "138" in cat or "ni act" in cat
    assert is_known is False
    assert sim >= 0.50


def test_matcher_rent_dispute(initialized_matcher):
    """Tenant eviction / rent dispute maps to rent appeal or rent control entries."""
    cat, freq, sim, is_known = initialized_matcher.match("tenant refusing to pay rent and vacate shop")
    assert "rent" in cat or "appeal" in cat or "suit" in cat
    assert is_known is False
    assert sim >= 0.40


def test_matcher_nonsense_fallback(initialized_matcher):
    """Completely random gibberish should fall below confidence threshold."""
    cat, freq, sim, is_known = initialized_matcher.match("xyzqwert1234987 nonsense totally unrelated phrase")
    assert is_known is False
    assert sim < CONFIDENCE_THRESHOLD


def test_inference_service_with_semantic_mapping(initialized_matcher):
    """InferenceService end-to-end integration with semantic category matcher."""
    case = CaseInput(
        case_id="TEST-SEMANTIC-01",
        type_name_val="commercial supplier breach of contract",
        purpose_name_val="appearance",
        case_age_days=200,
        first_listing_delay=15,
        statutory_eligible=1,
    )
    result = InferenceService.score_single_case(case)
    assert result.case_id == "TEST-SEMANTIC-01"
    assert result.matched_as is not None
    assert result.match_confidence is not None
    assert result.match_is_known is False
    assert result.recommendation in ["Lok Adalat", "Mediation", "Trial"]
    assert len(result.shap_factors) > 0
