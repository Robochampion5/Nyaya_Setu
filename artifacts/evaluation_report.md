# Nyaya Setu - Model Evaluation Report

- **Generated At**: 2026-08-22 15:38:49 UTC
- **Selected Model**: `XGBoost`
- **ROC-AUC**: `1.0000`
- **Accuracy**: `0.9999`
- **Precision (ADR)**: `0.9999`
- **Recall (ADR)**: `1.0000`
- **F1-Score (ADR)**: `0.9999`

### Confusion Matrix

| | Predicted Dismissal (0) | Predicted Lok Adalat (1) |
|---|---|---|
| **Actual Dismissal (0)** | 26,973 (TN) | 18 (FP) |
| **Actual Lok Adalat (1)** | 3 (FN) | 173,006 (TP) |

### Benchmark Comparison

| Metric | XGBoost | LightGBM |
|---|---|---|
| ROC-AUC | 1.0 | 1.0 |
| F1 (ADR) | 0.99994 | 0.99992 |
| Training Time | 1.47s | 1.2s |
