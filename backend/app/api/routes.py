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
    # All Indian States and Union Territories (as per e-Courts/NJDG codes)
    states = [
        {"code": 1, "name": "Maharashtra"},
        {"code": 2, "name": "Andhra Pradesh"},
        {"code": 3, "name": "Karnataka"},
        {"code": 4, "name": "Kerala"},
        {"code": 5, "name": "Tamil Nadu"},
        {"code": 6, "name": "Odisha"},
        {"code": 7, "name": "Punjab"},
        {"code": 8, "name": "Bihar"},
        {"code": 9, "name": "Rajasthan"},
        {"code": 10, "name": "Uttar Pradesh"},
        {"code": 11, "name": "Madhya Pradesh"},
        {"code": 12, "name": "West Bengal"},
        {"code": 13, "name": "Assam"},
        {"code": 14, "name": "Gujarat"},
        {"code": 15, "name": "Haryana"},
        {"code": 16, "name": "Himachal Pradesh"},
        {"code": 17, "name": "Jammu & Kashmir"},
        {"code": 18, "name": "Chhattisgarh"},
        {"code": 19, "name": "Jharkhand"},
        {"code": 20, "name": "Uttarakhand"},
        {"code": 21, "name": "Arunachal Pradesh"},
        {"code": 22, "name": "Manipur"},
        {"code": 23, "name": "Meghalaya"},
        {"code": 24, "name": "Mizoram"},
        {"code": 25, "name": "Nagaland"},
        {"code": 26, "name": "Sikkim"},
        {"code": 27, "name": "Tripura"},
        {"code": 28, "name": "Goa"},
        {"code": 29, "name": "Telangana"},
        # Union Territories
        {"code": 30, "name": "Delhi"},
        {"code": 31, "name": "Puducherry"},
        {"code": 32, "name": "Chandigarh"},
        {"code": 33, "name": "Andaman & Nicobar Islands"},
        {"code": 34, "name": "Dadra & Nagar Haveli"},
        {"code": 35, "name": "Daman & Diu"},
        {"code": 36, "name": "Lakshadweep"},
    ]

    # Districts for each state (representative sample for each state)
    districts = [
        # Maharashtra (code: 1)
        {"state_code": 1, "dist_code": 1, "name": "Mumbai City"},
        {"state_code": 1, "dist_code": 2, "name": "Mumbai Suburban"},
        {"state_code": 1, "dist_code": 3, "name": "Pune"},
        {"state_code": 1, "dist_code": 4, "name": "Nagpur"},
        {"state_code": 1, "dist_code": 5, "name": "Thane"},
        {"state_code": 1, "dist_code": 6, "name": "Nashik"},
        {"state_code": 1, "dist_code": 7, "name": "Aurangabad"},
        {"state_code": 1, "dist_code": 8, "name": "Solapur"},
        {"state_code": 1, "dist_code": 9, "name": "Kolhapur"},
        {"state_code": 1, "dist_code": 10, "name": "Nandurbar"},
        {"state_code": 1, "dist_code": 11, "name": "Dhule"},
        {"state_code": 1, "dist_code": 12, "name": "Jalgaon"},

        # Andhra Pradesh (code: 2)
        {"state_code": 2, "dist_code": 1, "name": "Visakhapatnam"},
        {"state_code": 2, "dist_code": 2, "name": "Vijayawada"},
        {"state_code": 2, "dist_code": 3, "name": "Guntur"},
        {"state_code": 2, "dist_code": 4, "name": "Nellore"},
        {"state_code": 2, "dist_code": 5, "name": "Kurnool"},
        {"state_code": 2, "dist_code": 6, "name": "Tirupati"},
        {"state_code": 2, "dist_code": 7, "name": "Kadapa"},
        {"state_code": 2, "dist_code": 8, "name": "Rajahmundry"},

        # Karnataka (code: 3)
        {"state_code": 3, "dist_code": 1, "name": "Bangalore Urban"},
        {"state_code": 3, "dist_code": 2, "name": "Bangalore Rural"},
        {"state_code": 3, "dist_code": 3, "name": "Mysore"},
        {"state_code": 3, "dist_code": 4, "name": "Mangalore"},
        {"state_code": 3, "dist_code": 5, "name": "Hubli-Dharwad"},
        {"state_code": 3, "dist_code": 6, "name": "Belgaum"},
        {"state_code": 3, "dist_code": 7, "name": "Gulbarga"},
        {"state_code": 3, "dist_code": 8, "name": "Shimoga"},

        # Kerala (code: 4)
        {"state_code": 4, "dist_code": 1, "name": "Thiruvananthapuram"},
        {"state_code": 4, "dist_code": 2, "name": "Kochi"},
        {"state_code": 4, "dist_code": 3, "name": "Kozhikode"},
        {"state_code": 4, "dist_code": 4, "name": "Thrissur"},
        {"state_code": 4, "dist_code": 5, "name": "Kollam"},
        {"state_code": 4, "dist_code": 6, "name": "Alappuzha"},

        # Tamil Nadu (code: 5)
        {"state_code": 5, "dist_code": 1, "name": "Chennai"},
        {"state_code": 5, "dist_code": 2, "name": "Coimbatore"},
        {"state_code": 5, "dist_code": 3, "name": "Madurai"},
        {"state_code": 5, "dist_code": 4, "name": "Tiruchirappalli"},
        {"state_code": 5, "dist_code": 5, "name": "Salem"},
        {"state_code": 5, "dist_code": 6, "name": "Tirunelveli"},

        # Odisha (code: 6)
        {"state_code": 6, "dist_code": 1, "name": "Bhubaneswar"},
        {"state_code": 6, "dist_code": 2, "name": "Cuttack"},
        {"state_code": 6, "dist_code": 3, "name": "Rourkela"},
        {"state_code": 6, "dist_code": 4, "name": "Berhampur"},
        {"state_code": 6, "dist_code": 5, "name": "Sambalpur"},

        # Punjab (code: 7)
        {"state_code": 7, "dist_code": 1, "name": "Ludhiana"},
        {"state_code": 7, "dist_code": 2, "name": "Amritsar"},
        {"state_code": 7, "dist_code": 3, "name": "Jalandhar"},
        {"state_code": 7, "dist_code": 4, "name": "Patiala"},
        {"state_code": 7, "dist_code": 5, "name": "Bathinda"},

        # Bihar (code: 8)
        {"state_code": 8, "dist_code": 1, "name": "Patna"},
        {"state_code": 8, "dist_code": 2, "name": "Gaya"},
        {"state_code": 8, "dist_code": 3, "name": "Bhagalpur"},
        {"state_code": 8, "dist_code": 4, "name": "Muzaffarpur"},
        {"state_code": 8, "dist_code": 5, "name": "Purnia"},
        {"state_code": 8, "dist_code": 6, "name": "Darbhanga"},
        {"state_code": 8, "dist_code": 7, "name": "Saran (Chapra)"},
        {"state_code": 8, "dist_code": 8, "name": "Motihari"},

        # Rajasthan (code: 9)
        {"state_code": 9, "dist_code": 1, "name": "Jaipur"},
        {"state_code": 9, "dist_code": 2, "name": "Jodhpur"},
        {"state_code": 9, "dist_code": 3, "name": "Udaipur"},
        {"state_code": 9, "dist_code": 4, "name": "Kota"},
        {"state_code": 9, "dist_code": 5, "name": "Bikaner"},
        {"state_code": 9, "dist_code": 6, "name": "Ajmer"},

        # Uttar Pradesh (code: 10)
        {"state_code": 10, "dist_code": 1, "name": "Lucknow"},
        {"state_code": 10, "dist_code": 2, "name": "Kanpur"},
        {"state_code": 10, "dist_code": 3, "name": "Agra"},
        {"state_code": 10, "dist_code": 4, "name": "Varanasi"},
        {"state_code": 10, "dist_code": 5, "name": "Allahabad (Prayagraj)"},
        {"state_code": 10, "dist_code": 6, "name": "Meerut"},
        {"state_code": 10, "dist_code": 7, "name": "Noida (Gautam Budh Nagar)"},
        {"state_code": 10, "dist_code": 8, "name": "Ghaziabad"},

        # Madhya Pradesh (code: 11)
        {"state_code": 11, "dist_code": 1, "name": "Bhopal"},
        {"state_code": 11, "dist_code": 2, "name": "Indore"},
        {"state_code": 11, "dist_code": 3, "name": "Jabalpur"},
        {"state_code": 11, "dist_code": 4, "name": "Gwalior"},
        {"state_code": 11, "dist_code": 5, "name": "Ujjain"},

        # West Bengal (code: 12)
        {"state_code": 12, "dist_code": 1, "name": "Kolkata"},
        {"state_code": 12, "dist_code": 2, "name": "Howrah"},
        {"state_code": 12, "dist_code": 3, "name": "Darjeeling"},
        {"state_code": 12, "dist_code": 4, "name": "Siliguri"},
        {"state_code": 12, "dist_code": 5, "name": "Durgapur"},
        {"state_code": 12, "dist_code": 6, "name": "Asansol"},

        # Assam (code: 13)
        {"state_code": 13, "dist_code": 1, "name": "Guwahati"},
        {"state_code": 13, "dist_code": 2, "name": "Silchar"},
        {"state_code": 13, "dist_code": 3, "name": "Dibrugarh"},
        {"state_code": 13, "dist_code": 4, "name": "Jorhat"},

        # Gujarat (code: 14)
        {"state_code": 14, "dist_code": 1, "name": "Ahmedabad"},
        {"state_code": 14, "dist_code": 2, "name": "Surat"},
        {"state_code": 14, "dist_code": 3, "name": "Vadodara"},
        {"state_code": 14, "dist_code": 4, "name": "Rajkot"},
        {"state_code": 14, "dist_code": 5, "name": "Gandhinagar"},

        # Haryana (code: 15)
        {"state_code": 15, "dist_code": 1, "name": "Gurugram"},
        {"state_code": 15, "dist_code": 2, "name": "Faridabad"},
        {"state_code": 15, "dist_code": 3, "name": "Rohtak"},
        {"state_code": 15, "dist_code": 4, "name": "Karnal"},
        {"state_code": 15, "dist_code": 5, "name": "Hisar"},

        # Himachal Pradesh (code: 16)
        {"state_code": 16, "dist_code": 1, "name": "Shimla"},
        {"state_code": 16, "dist_code": 2, "name": "Kangra"},
        {"state_code": 16, "dist_code": 3, "name": "Kullu"},
        {"state_code": 16, "dist_code": 4, "name": "Manali"},

        # Jammu & Kashmir (code: 17)
        {"state_code": 17, "dist_code": 1, "name": "Srinagar"},
        {"state_code": 17, "dist_code": 2, "name": "Jammu"},
        {"state_code": 17, "dist_code": 3, "name": "Anantnag"},
        {"state_code": 17, "dist_code": 4, "name": "Baramulla"},

        # Chhattisgarh (code: 18)
        {"state_code": 18, "dist_code": 1, "name": "Raipur"},
        {"state_code": 18, "dist_code": 2, "name": "Bilaspur"},
        {"state_code": 18, "dist_code": 3, "name": "Durg"},
        {"state_code": 18, "dist_code": 4, "name": "Bastar"},

        # Jharkhand (code: 19)
        {"state_code": 19, "dist_code": 1, "name": "Ranchi"},
        {"state_code": 19, "dist_code": 2, "name": "Jamshedpur"},
        {"state_code": 19, "dist_code": 3, "name": "Dhanbad"},
        {"state_code": 19, "dist_code": 4, "name": "Bokaro"},

        # Uttarakhand (code: 20)
        {"state_code": 20, "dist_code": 1, "name": "Dehradun"},
        {"state_code": 20, "dist_code": 2, "name": "Haridwar"},
        {"state_code": 20, "dist_code": 3, "name": "Nainital"},
        {"state_code": 20, "dist_code": 4, "name": "Roorkee"},

        # Arunachal Pradesh (code: 21)
        {"state_code": 21, "dist_code": 1, "name": "Itanagar"},
        {"state_code": 21, "dist_code": 2, "name": "Tawang"},
        {"state_code": 21, "dist_code": 3, "name": "Pasighat"},

        # Manipur (code: 22)
        {"state_code": 22, "dist_code": 1, "name": "Imphal"},
        {"state_code": 22, "dist_code": 2, "name": "Thoubal"},

        # Meghalaya (code: 23)
        {"state_code": 23, "dist_code": 1, "name": "Shillong"},
        {"state_code": 23, "dist_code": 2, "name": "Tura"},

        # Mizoram (code: 24)
        {"state_code": 24, "dist_code": 1, "name": "Aizawl"},

        # Nagaland (code: 25)
        {"state_code": 25, "dist_code": 1, "name": "Kohima"},
        {"state_code": 25, "dist_code": 2, "name": "Dimapur"},

        # Sikkim (code: 26)
        {"state_code": 26, "dist_code": 1, "name": "Gangtok"},

        # Tripura (code: 27)
        {"state_code": 27, "dist_code": 1, "name": "Agartala"},

        # Goa (code: 28)
        {"state_code": 28, "dist_code": 1, "name": "Panaji"},
        {"state_code": 28, "dist_code": 2, "name": "Margao"},
        {"state_code": 28, "dist_code": 3, "name": "Vasco da Gama"},

        # Telangana (code: 29)
        {"state_code": 29, "dist_code": 1, "name": "Hyderabad"},
        {"state_code": 29, "dist_code": 2, "name": "Secunderabad"},
        {"state_code": 29, "dist_code": 3, "name": "Warangal"},
        {"state_code": 29, "dist_code": 4, "name": "Nizamabad"},
        {"state_code": 29, "dist_code": 5, "name": "Karimnagar"},

        # Delhi (code: 30)
        {"state_code": 30, "dist_code": 1, "name": "Central Delhi"},
        {"state_code": 30, "dist_code": 2, "name": "South Delhi"},
        {"state_code": 30, "dist_code": 3, "name": "North Delhi"},
        {"state_code": 30, "dist_code": 4, "name": "East Delhi"},
        {"state_code": 30, "dist_code": 5, "name": "West Delhi"},
        {"state_code": 30, "dist_code": 6, "name": "New Delhi"},

        # Puducherry (code: 31)
        {"state_code": 31, "dist_code": 1, "name": "Puducherry"},
        {"state_code": 31, "dist_code": 2, "name": "Karaikal"},

        # Chandigarh (code: 32)
        {"state_code": 32, "dist_code": 1, "name": "Chandigarh"},

        # Andaman & Nicobar Islands (code: 33)
        {"state_code": 33, "dist_code": 1, "name": "Port Blair"},

        # Dadra & Nagar Haveli (code: 34)
        {"state_code": 34, "dist_code": 1, "name": "Silvassa"},

        # Daman & Diu (code: 35)
        {"state_code": 35, "dist_code": 1, "name": "Daman"},
        {"state_code": 35, "dist_code": 2, "name": "Diu"},

        # Lakshadweep (code: 36)
        {"state_code": 36, "dist_code": 1, "name": "Kavaratti"},
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

