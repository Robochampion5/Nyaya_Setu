"""
Nyaya Setu - API Route Handlers
===============================
Exposes endpoints for ADR Suitability Scoring, Batch Screening,
Health Checks, Model Metadata, and Reference Lookup Data.
"""

import time
from typing import Any, Dict, List, Optional, Union
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
import pandas as pd

from backend.app.core.config import settings
from backend.app.schemas.case import (
    CaseInput,
    CaseScoreResponse,
    BatchScoreRequest,
    BatchScoreResponse,
    HealthResponse,
    ReferenceDataResponse,
)
from backend.app.services.inference import InferenceService
from backend.app.services.model_loader import model_manager

router = APIRouter()


def _validation_summary() -> Dict[str, Any]:
    """Held-out metrics and honesty flags from the training metadata (never hard-coded)."""
    meta = model_manager.metadata
    m = meta.get("metrics", {})
    audit = meta.get("leakage_audit", {}) or {}
    cv = meta.get("leave_state_out_cv") or {}
    warnings = list(audit.get("warnings", []))
    if m.get("roc_auc", 0) >= 0.98 and not audit:
        warnings.append("Near-perfect score on a legacy artifact with no leakage audit; retrain with train.py.")
    return {
        "roc_auc": m.get("roc_auc"),
        "pr_auc": m.get("pr_auc"),
        "accuracy": m.get("accuracy"),
        "majority_class_accuracy": m.get("majority_class_accuracy"),
        "f1_score_adr": m.get("f1_score_adr"),
        "leave_state_out_auc_mean": cv.get("auc_mean"),
        "n_test": (meta.get("data") or {}).get("n_test"),
        "artifact_version": meta.get("version"),
        "leakage_suspected": bool(warnings),
        "warnings": warnings,
        "caveats": meta.get("caveats", []),
    }


@router.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Service health and readiness check."""
    uptime = time.time() - model_manager.start_time
    return HealthResponse(
        status="healthy" if model_manager.is_loaded else "degraded",
        version=settings.VERSION,
        model_loaded=model_manager.is_loaded,
        model_name=model_manager.metadata.get("model_name", "Unloaded / Heuristic"),
        features_count=len(model_manager.features),
        uptime_seconds=round(uptime, 1),
        validation=_validation_summary(),
    )


@router.post("/score_case", response_model=Union[CaseScoreResponse, List[CaseScoreResponse]], tags=["Inference"])
def score_case(payload: Union[CaseInput, List[CaseInput]]):
    """
    Score a single case or a batch list of cases for ADR suitability.
    Enforces Rule-First statutory exclusion under Mediation Act 2023,
    followed by ML suitability ranking and TreeSHAP explainability.
    """
    try:
        if isinstance(payload, list):
            # Batch of cases passed to /score_case
            return [InferenceService.score_single_case(c) for c in payload]
        else:
            return InferenceService.score_single_case(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")


@router.post("/score_batch", response_model=BatchScoreResponse, tags=["Inference"])
def score_batch(batch: BatchScoreRequest):
    """Screen and rank an entire cause list batch with aggregate statistics."""
    try:
        return InferenceService.score_batch(batch)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch scoring error: {str(e)}")


@router.post("/upload_cause_list", response_model=BatchScoreResponse, tags=["Inference"])
async def upload_cause_list(file: UploadFile = File(...)):
    """Upload a CSV cause list file and screen all cases in bulk."""
    try:
        contents = await file.read()
        import io
        df = pd.read_csv(io.BytesIO(contents))
        
        cases: List[CaseInput] = []
        for idx, row in df.iterrows():
            cases.append(
                CaseInput(
                    case_id=str(row.get("case_id", f"CSV-{idx+1}")),
                    state_code=int(row.get("state_code", 1)),
                    dist_code=int(row.get("dist_code", 1)),
                    court_no=int(row.get("court_no", 1)),
                    type_name_val=str(row.get("type_name_val", "cc")),
                    purpose_name_val=str(row.get("purpose_name_val", "appearance")),
                    case_age_days=float(row.get("case_age_days", 180.0)),
                    first_listing_delay=float(row.get("first_listing_delay", 30.0)),
                    statutory_eligible=int(row.get("statutory_eligible", 1)),
                    female_petitioner_clean=int(row.get("female_petitioner_clean", 0)),
                    female_defendant_clean=int(row.get("female_defendant_clean", 0)),
                    has_female_adv_pet=int(row.get("has_female_adv_pet", 0)),
                    has_female_adv_def=int(row.get("has_female_adv_def", 0)),
                )
            )
        return InferenceService.score_batch(BatchScoreRequest(cases=cases))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process uploaded CSV: {str(e)}")


@router.get("/reference_data", response_model=ReferenceDataResponse, tags=["Metadata"])
def get_reference_data():
    """Retrieve dropdown reference options, jurisdiction codes, and sample presets."""
    states = [
        {"code": 1, "name": "Maharashtra"},
        {"code": 2, "name": "Andhra Pradesh"},
        {"code": 3, "name": "Karnataka"},
        {"code": 8, "name": "Bihar"},
        {"code": 17, "name": "Gujarat"},
        {"code": 18, "name": "Chhattisgarh"},
        {"code": 27, "name": "Chandigarh"},
        {"code": 29, "name": "Telangana"},
    ]
    
    districts = [
        {"state_code": 1, "dist_code": 1, "name": "Nandurbar"},
        {"state_code": 1, "dist_code": 2, "name": "Dhule"},
        {"state_code": 1, "dist_code": 3, "name": "Jalgaon"},
        {"state_code": 2, "dist_code": 7, "name": "Kadapa"},
        {"state_code": 2, "dist_code": 15, "name": "Nellore"},
        {"state_code": 8, "dist_code": 4, "name": "Saran at Chapra"},
        {"state_code": 8, "dist_code": 10, "name": "Motihari"},
        {"state_code": 29, "dist_code": 1, "name": "Hyderabad"},
    ]
    
    courts = [
        {"court_no": 1, "name": "Chief Judicial Magistrate Court"},
        {"court_no": 2, "name": "Civil Court Senior Division"},
        {"court_no": 3, "name": "District & Sessions Court"},
        {"court_no": 4, "name": "Civil Court Junior Division / JMFC"},
    ]

    common_case_types = [
        {"id": "ni act (cheque bounce)", "name": "NI Act §138 (Cheque Bounce)", "statutory_eligible": 1, "category": "Commercial"},
        {"id": "s.c.c.", "name": "Small Causes Court Suit (S.C.C.)", "statutory_eligible": 1, "category": "Civil"},
        {"id": "mcop", "name": "Motor Accident Claims (MCOP)", "statutory_eligible": 1, "category": "Accident / Insurance"},
        {"id": "civil suit", "name": "Civil Suit (Property / Money Recovery)", "statutory_eligible": 1, "category": "Civil"},
        {"id": "matrimonial maintenance", "name": "Matrimonial / Maintenance Suit", "statutory_eligible": 1, "category": "Family"},
        {"id": "cri. case", "name": "Criminal Case (Compoundable)", "statutory_eligible": 1, "category": "Criminal"},
        {"id": "bail appln cbi", "name": "Bail Application (CBI / Serious Crime)", "statutory_eligible": 0, "category": "Excluded"},
        {"id": "murder u/s 302 ipc", "name": "IPC §302 Murder (Non-Compoundable)", "statutory_eligible": 0, "category": "Excluded"},
    ]

    common_purposes = [
        {"id": "appearance", "name": "Appearance of Parties"},
        {"id": "summons", "name": "Summons / Notice Service"},
        {"id": "depositing amount", "name": "Depositing Amount / Compromise"},
        {"id": "lok-nyayalaya", "name": "Lok Nyayalaya / Pre-conciliation"},
        {"id": "hearing", "name": "Preliminary Hearing"},
        {"id": "evidence", "name": "Evidence Stage"},
        {"id": "arguments", "name": "Final Arguments"},
    ]

    sample_presets = [
        {
            "label": "Cheque Bounce §138 (Bangalore Urban)",
            "description": "Commercial dispute ripe for instant Lok Adalat settlement",
            "data": {
                "case_id": "CNR-KA01-002341-2024",
                "state_code": 3,
                "dist_code": 1,
                "court_no": 2,
                "type_name_val": "ni act (cheque bounce)",
                "purpose_name_val": "appearance",
                "case_age_days": 195.0,
                "first_listing_delay": 25.0,
                "statutory_eligible": 1,
                "female_petitioner_clean": 0,
                "female_defendant_clean": 0,
                "has_female_adv_pet": 1,
                "has_female_adv_def": 1,
            }
        },
        {
            "label": "Motor Accident Claim MCOP (Pune)",
            "description": "Insurance claim with prolonged pendency",
            "data": {
                "case_id": "CNR-MH02-008912-2023",
                "state_code": 1,
                "dist_code": 2,
                "court_no": 1,
                "type_name_val": "mcop",
                "purpose_name_val": "depositing amount",
                "case_age_days": 420.0,
                "first_listing_delay": 45.0,
                "statutory_eligible": 1,
                "female_petitioner_clean": 1,
                "female_defendant_clean": 0,
                "has_female_adv_pet": 1,
                "has_female_adv_def": 1,
            }
        },
        {
            "label": "Small Causes Debt Recovery (Patna)",
            "description": "Early stage civil suit ideal for court-annexed mediation",
            "data": {
                "case_id": "CNR-BR08-001290-2024",
                "state_code": 8,
                "dist_code": 4,
                "court_no": 4,
                "type_name_val": "s.c.c.",
                "purpose_name_val": "summons",
                "case_age_days": 85.0,
                "first_listing_delay": 15.0,
                "statutory_eligible": 1,
                "female_petitioner_clean": 0,
                "female_defendant_clean": 1,
                "has_female_adv_pet": 1,
                "has_female_adv_def": 0,
            }
        },
        {
            "label": "Non-Compoundable CBI Bail Petition (Statutory Exclusion)",
            "description": "Explicitly barred under First Schedule Mediation Act 2023",
            "data": {
                "case_id": "CNR-MH01-009941-2024",
                "state_code": 1,
                "dist_code": 1,
                "court_no": 3,
                "type_name_val": "bail appln cbi",
                "purpose_name_val": "hearing",
                "case_age_days": 45.0,
                "first_listing_delay": 7.0,
                "statutory_eligible": 0,
                "female_petitioner_clean": 0,
                "female_defendant_clean": 0,
                "has_female_adv_pet": 1,
                "has_female_adv_def": 1,
            }
        },
    ]

    return ReferenceDataResponse(
        states=states,
        districts=districts,
        courts=courts,
        common_case_types=common_case_types,
        common_purposes=common_purposes,
        sample_presets=sample_presets,
    )


@router.get("/model_info", tags=["Metadata"])
def get_model_info():
    """Detailed model metadata, version, feature importance, and training metrics."""
    return {
        "is_loaded": model_manager.is_loaded,
        "metadata": model_manager.metadata,
        "thresholds": {
            "lok_adalat": settings.LOK_ADALAT_THRESHOLD,
            "mediation": settings.MEDIATION_THRESHOLD,
        },
        "features": model_manager.features,
    }

