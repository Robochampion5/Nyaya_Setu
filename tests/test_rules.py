"""
Unit Tests for Rule-First Statutory Exclusion Layer (Mediation Act 2023 / Section 89 CPC)
"""

import pytest
from backend.app.core.rules import StatutoryRuleEngine


def test_statutory_eligible_flag_zero_excluded():
    """Verify that statutory_eligible == 0 triggers a hard override exclusion."""
    is_eligible, status, reasons = StatutoryRuleEngine.evaluate_case(
        statutory_eligible=0,
        type_name_val="civil suit",
        purpose_name_val="appearance",
    )
    assert not is_eligible
    assert status == "Excluded (Trial Only)"
    assert len(reasons) > 0
    assert "Statutory Exclusion" in reasons[0]


def test_bail_application_statutory_exclusion():
    """Verify bail applications are excluded under First Schedule."""
    is_eligible, status, reasons = StatutoryRuleEngine.evaluate_case(
        statutory_eligible=1,
        type_name_val="bail appln cbi",
        purpose_name_val="hearing",
    )
    assert not is_eligible
    assert status == "Excluded (Trial Only)"
    assert any("bail" in r.lower() for r in reasons)


def test_serious_criminal_ipc_302_exclusion():
    """Verify murder/non-compoundable offenses are excluded."""
    is_eligible, status, reasons = StatutoryRuleEngine.evaluate_case(
        statutory_eligible=1,
        type_name_val="murder u/s 302 ipc",
        purpose_name_val="evidence",
    )
    assert not is_eligible
    assert status == "Excluded (Trial Only)"


def test_ni_act_cheque_bounce_eligible():
    """Verify Section 138 NI Act cases pass the statutory filter as eligible."""
    is_eligible, status, reasons = StatutoryRuleEngine.evaluate_case(
        statutory_eligible=1,
        type_name_val="ni act (cheque bounce)",
        purpose_name_val="appearance",
    )
    assert is_eligible
    assert status == "Eligible"
    assert len(reasons) == 0


def test_mcop_motor_accident_eligible():
    """Verify Motor Accident Claims (MCOP) pass as eligible."""
    is_eligible, status, reasons = StatutoryRuleEngine.evaluate_case(
        statutory_eligible=1,
        type_name_val="mcop",
        purpose_name_val="depositing amount",
    )
    assert is_eligible
    assert status == "Eligible"


def test_small_causes_court_eligible():
    """Verify Small Causes Court (S.C.C.) suits pass as eligible."""
    is_eligible, status, reasons = StatutoryRuleEngine.evaluate_case(
        statutory_eligible=1,
        type_name_val="s.c.c.",
        purpose_name_val="summons",
    )
    assert is_eligible
    assert status == "Eligible"

