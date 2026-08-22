"""
Nyaya Setu - Statutory Rule Engine
===================================
Enforces the First Schedule of the Mediation Act 2023 and Section 89 CPC.
Provides a hard override layer that excludes non-compoundable criminal matters,
bail petitions, serious economic offences, and disputes not fit for mediation
before any ML model inference.
"""

from typing import Dict, List, Optional, Tuple, Any

# Excluded categories under First Schedule, Mediation Act 2023
STATUTORY_EXCLUSION_PATTERNS = [
    ("bail", "Bail applications are non-negotiable judicial proceedings (First Schedule, Entry 3)"),
    ("cbi", "Special statutory investigation / anti-corruption cases barred from conciliation (First Schedule, Entry 4)"),
    ("nia", "National Investigation Agency matters are strictly non-compoundable"),
    ("corruption", "Offences under Prevention of Corruption Act cannot be mediated"),
    ("ndps", "Narcotic Drugs and Psychotropic Substances Act offences are non-compoundable"),
    ("pocso", "Offences against minors under POCSO Act are strictly non-compoundable"),
    ("murder", "Capital offences under Section 302/307 IPC are barred from mediation"),
    ("rape", "Sexual offences are non-compoundable under Indian law"),
    ("writ", "Constitutional writs against statutory bodies require judicial adjudication"),
    ("police case", "Cognizable police prosecution cases without statutory compounding provision"),
]

# Compoundable / ADR-friendly types under Section 89 CPC & Mediation Act 2023
STATUTORY_ELIGIBLE_INDICATORS = [
    ("ni act", "Negotiable Instruments Act §138 is statutory compoundable and prime candidate for Lok Adalat"),
    ("cheque bounce", "Dishonour of cheque is compoundable under Section 147 NI Act"),
    ("s.c.c.", "Small Causes Court claims are ideal for summary ADR and conciliation"),
    ("mcop", "Motor accident claims are statutory Lok Adalat priority under Motor Vehicles Act"),
    ("motor vehicle", "Motor accident claims tribunal cases are prime Lok Adalat candidates"),
    ("civil suit", "Civil disputes regarding property, partition, or money recovery are eligible under Section 89 CPC"),
    ("money suit", "Commercial recovery disputes are eligible for mediation"),
    ("matrimonial", "Family/matrimonial disputes are explicitly encouraged for pre-litigation mediation"),
    ("compoundable", "Compoundable offences under Section 320 CrPC / Section 359 BNSS"),
]


class StatutoryRuleEngine:
    """Rule-first filter enforcing Mediation Act 2023 statutory eligibility."""

    @staticmethod
    def evaluate_case(
        statutory_eligible: Optional[int] = None,
        type_name_val: Optional[str] = None,
        purpose_name_val: Optional[str] = None,
    ) -> Tuple[bool, str, List[str]]:
        """
        Evaluate statutory eligibility.
        
        Returns:
            Tuple of:
            - is_eligible (bool): True if allowed for ML scoring, False if excluded
            - statutory_status (str): "Eligible" or "Excluded (Trial Only)"
            - exclusion_reasons (List[str]): List of plain-English legal grounds
        """
        type_str = str(type_name_val or "").lower().strip()
        purpose_str = str(purpose_name_val or "").lower().strip()
        
        reasons: List[str] = []
        
        # 1. Hard Flag check (from dataset or upstream schema)
        if statutory_eligible is not None and statutory_eligible == 0:
            reasons.append(
                "Statutory Exclusion: Flagged as non-compoundable/ineligible under First Schedule, Mediation Act 2023."
            )
            
        # 2. Case Type keyword pattern checks
        for pattern, explanation in STATUTORY_EXCLUSION_PATTERNS:
            if pattern in type_str or pattern in purpose_str:
                reasons.append(f"Statutory Bar ({pattern.upper()}): {explanation}")
                
        # If any exclusion trigger matched, return hard exclusion
        if reasons or (statutory_eligible is not None and statutory_eligible == 0):
            if not reasons:
                reasons.append("Statutory Exclusion: Ineligible for ADR under Section 89 CPC / Mediation Act 2023.")
            return False, "Excluded (Trial Only)", reasons
            
        # Eligible for ADR ML Scoring
        return True, "Eligible", []
        
    @staticmethod
    def get_statutory_context(type_name_val: Optional[str] = None) -> List[str]:
        """Provide legal context notes for eligible cases."""
        type_str = str(type_name_val or "").lower().strip()
        notes = []
        for pattern, desc in STATUTORY_ELIGIBLE_INDICATORS:
            if pattern in type_str:
                notes.append(desc)
        return notes

