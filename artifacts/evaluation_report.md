# Nyaya Setu - Model Evaluation Report

- **Generated At**: 2026-10-07 19:57:18 UTC
- **Selected Model**: `LightGBM`
- **Features used (9)**: `female_petitioner_clean`, `female_defendant_clean`, `has_female_adv_pet`, `has_female_adv_def`, `case_age_days`, `first_listing_delay`, `type_name_val_freq`, `purpose_name_val_freq`, `judge_position_freq`
- **Split**: train 608,148 / validation 130,317 / test 130,318 (stratified; early stopping and threshold use validation only; test scored once)
- **Frequency maps fit on**: train split only

## Held-out test results

| Metric | Value |
|---|---|
| ROC-AUC | 1.0000 |
| PR-AUC | 1.0000 (ADR base rate 0.845) |
| Accuracy | 0.9986 (always-predict-majority = 0.8448) |
| Precision / Recall / F1 (ADR) | 0.9990 / 0.9992 / 0.9991 |
| Macro F1 | 0.9972 |
| Brier score | 0.0013 |
| Decision threshold (validation-tuned) | 0.58 |

### Confusion matrix (test)

| | Predicted Not-ADR (0) | Predicted ADR (1) |
|---|---|---|
| **Actual 0** | 20,116 (TN) | 105 (FP) |
| **Actual 1** | 83 (FN) | 110,014 (TP) |

### Benchmark (test)

| Metric | XGBoost | LightGBM |
|---|---|---|
| ROC-AUC | 0.99994 | 0.99996 |
| PR-AUC | 0.99999 | 0.99999 |
| F1 (ADR) | 0.99871 | 0.99915 |
| Train time (s) | 7.7 | 3.5 |

## Leakage audit

Validation AUC of a shallow tree seeing ONE feature at a time:

| Feature | Single-feature AUC |
|---|---|
| `state_code` | 1.000 |
| `type_name_val_freq` | 0.945 |
| `purpose_name_val_freq` | 0.943 |
| `judge_position_freq` | 0.934 |
| `court_no` | 0.872 |
| `dist_code` | 0.823 |
| `first_listing_delay` | 0.658 |
| `case_age_days` | 0.620 |
| `female_defendant_clean` | 0.521 |
| `female_petitioner_clean` | 0.517 |
| `has_female_adv_pet` | 0.512 |
| `has_female_adv_def` | 0.507 |
| `statutory_eligible` | 0.500 |

- Geography-only (state+district+court) AUC: **1.000**
- Validation AUC if geography IDs are allowed: **1.000**

> WARNING: `state_code` alone reaches validation AUC 1.000 - likely a label proxy or data-source artefact.
> WARNING: `type_name_val_freq` alone reaches validation AUC 0.945 - likely a label proxy or data-source artefact.
> WARNING: `purpose_name_val_freq` alone reaches validation AUC 0.943 - likely a label proxy or data-source artefact.
> WARNING: `judge_position_freq` alone reaches validation AUC 0.934 - likely a label proxy or data-source artefact.
> WARNING: With geography allowed, `state_code` carries 2000% of model importance: the label tracks where the record came from, not the dispute.
> WARNING: Leave-state-out AUC (0.648) is far below the random-split AUC (1.000): the model does not transfer across states.
> WARNING: Test AUC 1.0000 is implausibly high for court-outcome data; check how `is_adr_target` was derived (e.g. from disp_name_val) and whether any feature encodes it.

## Leave-state-out generalisation

Train on some states, score entirely unseen states:

- Mean AUC **0.648**, worst fold **0.554** (per fold: [0.5545, 0.7418])

## Caveats

- LEAKAGE SUSPECTED - see leakage_audit. Do not present these scores as real-world accuracy.
- Labels are historical outcomes (is_adr_target); the model predicts historical patterns, not what is legally or ethically right.
- The model is tabular only (XGBoost/LightGBM). No text or language model is used.
- Advisory screening tool: a human DLSA decision-maker makes the referral.
