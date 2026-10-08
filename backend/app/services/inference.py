"""
Nyaya Setu - Inference & Scoring Pipeline
=========================================
Orchestrates rule-first statutory checking, feature vector construction,
model prediction, and TreeSHAP explainability for single cases and bulk cause lists.
"""

import logging
import time
from typing import List, Optional, Tuple
import numpy as np
import pandas as pd

from backend.app.core.config import settings
from backend.app.core.rules import StatutoryRuleEngine
from backend.app.schemas.case import (
    CaseInput,
    CaseScoreResponse,
    BatchScoreRequest,
    BatchScoreResponse,
    BatchSummary,
)
from backend.app.services.model_loader import model_manager

logger = logging.getLogger("NyayaSetuInference")


class InferenceService:
    """Inference engine executing rule-first filter + ML ranking + SHAP attribution."""

    @staticmethod
    def score_single_case(case: CaseInput) -> CaseScoreResponse:
        """Score a single district court case."""
        start_t = time.time()
        case_id = case.case_id or f"DLSA-{case.state_code:02d}-{case.dist_code:02d}-{case.court_no:02d}-{int(time.time() * 1000) % 100000}"

        # ---------------------------------------------------------
        # 1. Rule-First Statutory Exclusion Layer (Mediation Act 2023)
        # ---------------------------------------------------------
        is_eligible, statutory_status, exclusion_reasons = StatutoryRuleEngine.evaluate_case(
            statutory_eligible=case.statutory_eligible,
            type_name_val=case.type_name_val,
            purpose_name_val=case.purpose_name_val,
        )

        # If excluded, immediately return Trial Only with 0% suitability (Skip ML)
        if not is_eligible:
            exec_time = round((time.time() - start_t) * 1000.0, 2)
            return CaseScoreResponse(
                case_id=case_id,
                suitability_score=0.0,
                suitability_percentage=0.0,
                recommendation="Trial",
                statutory_status=statutory_status,
                confidence_tier="Excluded",
                is_statutory_eligible=False,
                top_reasons=exclusion_reasons,
                shap_factors=[],
                statutory_notes=[
                    "First Schedule, Mediation Act 2023: Case type/proceedings are barred from mediation.",
                    "Matter must proceed for regular contested trial under Civil/Criminal Procedure Codes.",
                ],
                execution_time_ms=exec_time,
                matched_as=case.type_name_val,
                match_confidence=1.0,
                match_is_known=True,
            )

        # ---------------------------------------------------------
        # 2. Resolve Case Type via Semantic Category Matcher (Option D2)
        # ---------------------------------------------------------
        matched_as: Optional[str] = case.type_name_val
        match_confidence: Optional[float] = 1.0
        match_is_known: bool = True
        type_freq: float

        if case.type_name_val_freq is not None:
            # Caller pre-computed the frequency; skip matching
            type_freq = case.type_name_val_freq
        elif model_manager.category_matcher.is_ready and case.type_name_val:
            _matched_cat, _freq, _sim, _is_known = model_manager.category_matcher.match(case.type_name_val)
            type_freq = _freq
            matched_as = _matched_cat if _matched_cat else case.type_name_val
            match_confidence = round(_sim, 3)
            match_is_known = _is_known

            # If matched category triggers statutory exclusion, exclude it immediately
            if matched_as:
                is_m_eligible, m_status, m_reasons = StatutoryRuleEngine.evaluate_case(
                    type_name_val=matched_as,
                    purpose_name_val=case.purpose_name_val,
                )
                if not is_m_eligible:
                    exec_time = round((time.time() - start_t) * 1000.0, 2)
                    return CaseScoreResponse(
                        case_id=case_id,
                        suitability_score=0.0,
                        suitability_percentage=0.0,
                        recommendation="Trial",
                        statutory_status=m_status,
                        confidence_tier="Excluded",
                        is_statutory_eligible=False,
                        top_reasons=m_reasons,
                        shap_factors=[],
                        statutory_notes=[
                            f"Mapped to '{matched_as}' which is barred from mediation under First Schedule, Mediation Act 2023.",
                            "Matter must proceed for regular contested trial under Civil/Criminal Procedure Codes.",
                        ],
                        execution_time_ms=exec_time,
                        matched_as=matched_as,
                        match_confidence=match_confidence,
                        match_is_known=match_is_known,
                    )
        else:
            type_freq = model_manager.get_type_freq(case.type_name_val)

        # ---------------------------------------------------------
        # 3. Build Feature Vector
        # ---------------------------------------------------------
        purpose_freq = case.purpose_name_val_freq or model_manager.get_purpose_freq(case.purpose_name_val)
        judge_freq = case.judge_position_freq or model_manager.get_judge_freq()

        feature_dict = {
            "state_code": int(case.state_code),
            "dist_code": int(case.dist_code),
            "court_no": int(case.court_no),
            "female_petitioner_clean": int(case.female_petitioner_clean),
            "female_defendant_clean": int(case.female_defendant_clean),
            "has_female_adv_pet": int(case.has_female_adv_pet),
            "has_female_adv_def": int(case.has_female_adv_def),
            "case_age_days": float(case.case_age_days),
            "first_listing_delay": float(case.first_listing_delay),
            "statutory_eligible": 1,
            "type_name_val_freq": float(type_freq),
            "purpose_name_val_freq": float(purpose_freq),
            "judge_position_freq": float(judge_freq),
        }

        # Expected canonical column order
        feature_cols = model_manager.features if model_manager.features else list(feature_dict.keys())
        feature_df = pd.DataFrame([feature_dict])[feature_cols]

        # ---------------------------------------------------------
        # 3. Model Scoring & Threshold Calibration
        # ---------------------------------------------------------
        if model_manager.model is not None:
            try:
                prob = float(model_manager.model.predict_proba(feature_df)[0, 1])
            except Exception as e:
                logger.error("Model prediction error: %s. Using heuristic scoring.", e)
                prob = InferenceService._heuristic_score(case, type_freq, purpose_freq)
        else:
            # Fallback heuristic if model artifact not yet generated
            prob = InferenceService._heuristic_score(case, type_freq, purpose_freq)

        suitability_score = round(prob * 100.0, 1)

        # Decision threshold mapping
        if suitability_score >= (settings.LOK_ADALAT_THRESHOLD * 100):
            recommendation = "Lok Adalat"
            confidence_tier = "High"
        elif suitability_score >= (settings.MEDIATION_THRESHOLD * 100):
            recommendation = "Mediation"
            confidence_tier = "Moderate"
        else:
            recommendation = "Trial"
            confidence_tier = "Low"

        # ---------------------------------------------------------
        # 4. TreeSHAP Explainability
        # ---------------------------------------------------------
        top_reasons, shap_factors = [], []
        explainer_type_str = (
            f"{case.type_name_val} (mapped to {matched_as})"
            if (matched_as and not match_is_known and matched_as != case.type_name_val)
            else (matched_as or case.type_name_val)
        )
        if model_manager.explainer_service is not None:
            top_reasons, shap_factors = model_manager.explainer_service.explain_instance(
                feature_df=feature_df,
                raw_case_type=explainer_type_str,
                raw_purpose=case.purpose_name_val,
                case_age_days=case.case_age_days,
            )
        else:
            top_reasons = [
                f"Case type '{explainer_type_str or 'Civil'}' has favorable settlement precedent under Section 89 CPC.",
                f"Stage '{case.purpose_name_val or 'Hearing'}' allows effective conciliation before trial escalation.",
                f"Pendency of {int(case.case_age_days)} days qualifies for DLSA fast-track screening.",
            ]

        # Statutory context notes
        statutory_notes = StatutoryRuleEngine.get_statutory_context(matched_as or case.type_name_val)
        if not statutory_notes:
            statutory_notes.append("Statutory eligible under Section 89 CPC for court-annexed mediation.")

        exec_time = round((time.time() - start_t) * 1000.0, 2)

        return CaseScoreResponse(
            case_id=case_id,
            suitability_score=suitability_score,
            suitability_percentage=suitability_score,
            recommendation=recommendation,
            statutory_status="Eligible",
            confidence_tier=confidence_tier,
            is_statutory_eligible=True,
            top_reasons=top_reasons,
            shap_factors=shap_factors,
            statutory_notes=statutory_notes,
            execution_time_ms=exec_time,
            matched_as=matched_as,
            match_confidence=match_confidence,
            match_is_known=match_is_known,
        )

    @staticmethod
    def score_batch(batch: BatchScoreRequest) -> BatchScoreResponse:
        """Screen and rank a batch of district court cases."""
        results: List[CaseScoreResponse] = []
        lok_adalat_count = 0
        mediation_count = 0
        trial_count = 0
        excluded_count = 0
        total_score = 0.0

        for case in batch.cases:
            res = InferenceService.score_single_case(case)
            results.append(res)
            
            if res.recommendation == "Lok Adalat":
                lok_adalat_count += 1
            elif res.recommendation == "Mediation":
                mediation_count += 1
            else:
                trial_count += 1
                
            if not res.is_statutory_eligible:
                excluded_count += 1
                
            total_score += res.suitability_score

        total_cases = len(results)
        eligible_count = total_cases - excluded_count
        avg_score = round(total_score / max(1, total_cases), 1)
        
        # DLSA Impact estimation: 1 successful Lok Adalat referral saves ~14 court hours
        est_hours_saved = round((lok_adalat_count * 14.0) + (mediation_count * 8.0), 1)

        summary = BatchSummary(
            total_cases=total_cases,
            eligible_count=eligible_count,
            excluded_count=excluded_count,
            lok_adalat_count=lok_adalat_count,
            mediation_count=mediation_count,
            trial_count=trial_count,
            average_suitability_score=avg_score,
            estimated_court_hours_saved=est_hours_saved,
        )

        return BatchScoreResponse(summary=summary, results=results)

    @staticmethod
    def _heuristic_score(case: CaseInput, type_freq: float, purpose_freq: float) -> float:
        """Robust fallback heuristic calculation."""
        score = 0.50
        type_str = str(case.type_name_val or "").lower()
        
        if "ni act" in type_str or "cheque" in type_str or "s.c.c." in type_str:
            score += 0.30
        elif "mcop" in type_str or "motor" in type_str or "civil" in type_str:
            score += 0.20
        elif "cri" in type_str or "criminal" in type_str:
            score -= 0.15

        if case.case_age_days > 300:
            score += 0.10
        if case.has_female_adv_pet and case.has_female_adv_def:
            score += 0.05

        return float(np.clip(score, 0.05, 0.95))

