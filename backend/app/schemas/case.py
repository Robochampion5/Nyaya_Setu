"""
Nyaya Setu - Pydantic Request & Response Schemas
================================================
Defines type-safe data contracts for single case scoring, batch screening,
SHAP explanations, and reference data.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict


class CaseInput(BaseModel):
    """Input payload for a single district court case."""
    model_config = ConfigDict(extra="ignore")

    case_id: Optional[str] = Field(default=None, description="CNR number or unique case identifier")
    state_code: int = Field(default=1, ge=1, le=50, description="Numeric State Code")
    dist_code: int = Field(default=1, ge=1, le=200, description="Numeric District Code")
    court_no: int = Field(default=1, ge=1, le=100, description="Court / Bench Number")
    
    type_name_val: Optional[str] = Field(default="ni act (cheque bounce)", description="Case type name (e.g. 'ni act', 's.c.c.', 'mcop')")
    purpose_name_val: Optional[str] = Field(default="appearance", description="Hearing purpose/stage (e.g. 'appearance', 'summons', 'depositing amount')")
    
    case_age_days: float = Field(default=180.0, ge=0.0, description="Days elapsed since initial filing")
    first_listing_delay: float = Field(default=30.0, ge=0.0, description="Days elapsed between filing and first hearing")
    statutory_eligible: Optional[int] = Field(default=1, ge=0, le=1, description="Statutory eligibility flag (1=Eligible, 0=Excluded)")
    
    female_petitioner_clean: int = Field(default=0, ge=0, le=1, description="Female petitioner indicator (1=Yes, 0=No/Unspecified)")
    female_defendant_clean: int = Field(default=0, ge=0, le=1, description="Female defendant indicator (1=Yes, 0=No/Unspecified)")
    has_female_adv_pet: int = Field(default=0, ge=0, le=1, description="Female advocate for petitioner (1=Yes, 0=No/Unrepresented)")
    has_female_adv_def: int = Field(default=0, ge=0, le=1, description="Female advocate for defendant (1=Yes, 0=No/Unrepresented)")
    
    # Optional direct frequencies (if already computed)
    type_name_val_freq: Optional[float] = Field(default=None, description="Pre-calculated case type frequency")
    purpose_name_val_freq: Optional[float] = Field(default=None, description="Pre-calculated purpose stage frequency")
    judge_position_freq: Optional[float] = Field(default=None, description="Pre-calculated judge position frequency")


class ShapFactor(BaseModel):
    """Detailed feature contribution breakdown from TreeSHAP."""
    feature: str = Field(description="Internal feature name")
    display_name: str = Field(description="Human-readable legal feature name")
    shap_value: float = Field(description="Raw SHAP attribution value")
    impact_percent: float = Field(description="Normalized percentage contribution to ADR score")
    direction: str = Field(description="'positive' (increases ADR suitability) or 'negative' (favors trial)")
    explanation: str = Field(description="Plain-English explanation for judicial scrutiny committee")


class CaseScoreResponse(BaseModel):
    """Evaluation result for a single case."""
    case_id: str
    suitability_score: float = Field(description="ADR Suitability Score (0.0 to 100.0%)")
    suitability_percentage: float = Field(description="Alias for suitability_score")
    recommendation: str = Field(description="'Lok Adalat', 'Mediation', or 'Trial'")
    statutory_status: str = Field(description="'Eligible' or 'Excluded (Trial Only)'")
    confidence_tier: str = Field(description="'High', 'Moderate', 'Low', or 'Excluded'")
    is_statutory_eligible: bool
    top_reasons: List[str] = Field(description="Plain-English factors for Case Scrutiny Committee")
    shap_factors: List[ShapFactor] = Field(default_factory=list, description="Structured SHAP breakdown")
    statutory_notes: List[str] = Field(default_factory=list, description="Statutory compliance and Section 89 references")
    execution_time_ms: float = Field(default=0.0, description="Scoring latency in milliseconds")


class BatchScoreRequest(BaseModel):
    """Batch case scoring request."""
    cases: List[CaseInput] = Field(description="List of case records to screen")


class BatchSummary(BaseModel):
    """Summary statistics for a cause list screening batch."""
    total_cases: int
    eligible_count: int
    excluded_count: int
    lok_adalat_count: int
    mediation_count: int
    trial_count: int
    average_suitability_score: float
    estimated_court_hours_saved: float


class BatchScoreResponse(BaseModel):
    """Batch screening result payload."""
    summary: BatchSummary
    results: List[CaseScoreResponse]


class HealthResponse(BaseModel):
    """Health check payload."""
    status: str
    version: str
    model_loaded: bool
    model_name: Optional[str] = None
    features_count: int
    uptime_seconds: float


class ReferenceDataResponse(BaseModel):
    """Dropdown and reference data for UI."""
    states: List[Dict[str, Any]]
    districts: List[Dict[str, Any]]
    courts: List[Dict[str, Any]]
    common_case_types: List[Dict[str, Any]]
    common_purposes: List[Dict[str, Any]]
    sample_presets: List[Dict[str, Any]]

