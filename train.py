#!/usr/bin/env python3
"""
Nyaya Setu - Model Training & Evaluation Pipeline
==================================================
Standalone, self-contained ML pipeline for ADR Suitability Ranking.
Supports CPU and CUDA/GPU training, stratified train/test split,
XGBoost & LightGBM benchmarking, TreeSHAP preparation, and deterministic artifact export.

Usage:
    python train.py --sample-size 1000000 --device cpu --model-type benchmark
    python train.py --sample-size 1000000 --device cuda --model-type xgboost
    python train.py --sample-size 50000 --device cpu --output-dir artifacts/
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("NyayaSetuTrainer")

# Canonical feature list used for model training and inference
NUMERICAL_FEATURES = [
    "state_code",
    "dist_code",
    "court_no",
    "female_petitioner_clean",
    "female_defendant_clean",
    "has_female_adv_pet",
    "has_female_adv_def",
    "case_age_days",
    "first_listing_delay",
    "statutory_eligible",
    "type_name_val_freq",
    "purpose_name_val_freq",
    "judge_position_freq",
]

TARGET_COL = "is_adr_target"


def find_dataset(custom_path: Optional[str] = None) -> Path:
    """Locate the clean dataset file (parquet or csv)."""
    candidates = []
    if custom_path:
        candidates.append(Path(custom_path))
    
    # Common locations
    workspace_root = Path(__file__).resolve().parent
    candidates.extend([
        workspace_root / "nyaya_setu_clean.parquet",
        workspace_root / "nyaya_setu_clean.csv",
        workspace_root.parent / "nyaya_setu_clean.parquet",
        workspace_root.parent / "nyaya_setu_clean.csv",
        Path("/Users/aarushgupta/Desktop/Nyaya-Setu/nyaya_setu_clean.parquet"),
        Path("/Users/aarushgupta/Desktop/Nyaya-Setu/nyaya_setu_clean.csv"),
    ])
    
    for path in candidates:
        if path.exists() and path.is_file():
            logger.info("Found dataset at: %s (%.2f MB)", path, path.stat().st_size / (1024 * 1024))
            return path
            
    raise FileNotFoundError(
        f"Dataset not found. Searched paths: {[str(p) for p in candidates]}. "
        "Please specify with --data-path."
    )


def load_and_preprocess_data(
    data_path: Path,
    sample_size: int = 1000000,
    random_state: int = 42,
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Load dataset, build frequency lookup tables, and perform stratified sampling.
    Default sample size: 10 Lakh (1,000,000) rows.
    """
    logger.info("Loading dataset from %s ...", data_path)
    start_time = time.time()
    
    if data_path.suffix.lower() == ".parquet":
        df = pd.read_parquet(data_path)
    else:
        # Read CSV with optimized dtypes
        dtypes = {
            "state_code": "int16",
            "dist_code": "int16",
            "court_no": "int16",
            "type_name_val": "str",
            "purpose_name_val": "str",
            "disp_name_val": "str",
            "is_adr_target": "int8",
            "female_petitioner_clean": "int8",
            "female_defendant_clean": "int8",
            "has_female_adv_pet": "int8",
            "has_female_adv_def": "int8",
            "case_age_days": "float32",
            "first_listing_delay": "float32",
            "statutory_eligible": "int8",
            "type_name_val_freq": "float32",
            "purpose_name_val_freq": "float32",
            "judge_position_freq": "float32",
        }
        df = pd.read_csv(data_path, dtype=dtypes)
        
    load_time = time.time() - start_time
    logger.info("Loaded %d rows with %d columns in %.2f seconds", len(df), len(df.columns), load_time)
    
    # Build string-to-frequency lookup maps for inference from the full dataset
    logger.info("Generating categorical frequency lookup tables...")
    total_records = len(df)
    
    type_freq_series = df["type_name_val"].value_counts() / total_records
    type_freq_map = {str(k).lower().strip(): float(v) for k, v in type_freq_series.items()}
    
    purpose_freq_series = df["purpose_name_val"].value_counts() / total_records
    purpose_freq_map = {str(k).lower().strip(): float(v) for k, v in purpose_freq_series.items()}
    
    # Calculate median defaults for fallback
    frequency_maps = {
        "type_name_val_freq_map": type_freq_map,
        "purpose_name_val_freq_map": purpose_freq_map,
        "default_type_freq": float(type_freq_series.median()),
        "default_purpose_freq": float(purpose_freq_series.median()),
        "default_judge_position_freq": float(df["judge_position_freq"].median()),
        "total_dataset_rows": total_records,
        "features": NUMERICAL_FEATURES,
    }
    
    # Stratified Sampling (default 10 lakh = 1,000,000 rows)
    if sample_size > 0 and sample_size < len(df):
        logger.info(
            "Performing stratified sampling of %d rows (%.1f%% of full dataset) on '%s'...",
            sample_size, (sample_size / len(df)) * 100, TARGET_COL
        )
        sample_fraction = sample_size / len(df)
        df_sampled, _ = train_test_split(
            df,
            train_size=sample_fraction,
            stratify=df[TARGET_COL],
            random_state=random_state,
        )
        df = df_sampled.copy()
        logger.info("Sampled dataset shape: %s", df.shape)
    else:
        logger.info("Using all %d records for training/testing", len(df))
        
    return df, frequency_maps


def split_data(
    df: pd.DataFrame,
    test_size: float = 0.20,
    random_state: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """Perform stratified 80/20 train/test split."""
    X = df[NUMERICAL_FEATURES].copy()
    y = df[TARGET_COL].copy()
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=test_size,
        stratify=y,
        random_state=random_state,
    )
    
    logger.info(
        "Train set: %d rows (Positive rate: %.2f%%) | Test set: %d rows (Positive rate: %.2f%%)",
        len(X_train), (y_train.mean() * 100), len(X_test), (y_test.mean() * 100)
    )
    return X_train, X_test, y_train, y_test


def train_xgboost(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    device: str = "cpu",
    n_estimators: int = 250,
    max_depth: int = 6,
    learning_rate: float = 0.08,
) -> Tuple[Any, Dict[str, Any], float]:
    """Train and evaluate XGBoost classifier."""
    import xgboost as xgb
    
    xgb_device = "cuda" if device in ["cuda", "gpu"] else "cpu"
    tree_method = "hist"
    
    logger.info(
        "Training XGBoost (n_estimators=%d, max_depth=%d, lr=%.3f, tree_method='%s', device='%s')...",
        n_estimators, max_depth, learning_rate, tree_method, xgb_device
    )
    
    model = xgb.XGBClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        subsample=0.85,
        colsample_bytree=0.85,
        tree_method=tree_method,
        device=xgb_device,
        random_state=42,
        eval_metric="auc",
        early_stopping_rounds=20,
        n_jobs=-1 if xgb_device == "cpu" else None,
    )
    
    start_t = time.time()
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=50,
    )
    train_duration = time.time() - start_t
    logger.info("XGBoost training completed in %.2f seconds", train_duration)
    
    metrics = evaluate_model(model, X_test, y_test, model_name="XGBoost")
    metrics["train_duration_sec"] = round(train_duration, 2)
    return model, metrics, train_duration


def train_lightgbm(
    X_train: pd.DataFrame,
    y_train: pd.Series,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    device: str = "cpu",
    n_estimators: int = 250,
    max_depth: int = 6,
    learning_rate: float = 0.08,
) -> Tuple[Any, Dict[str, Any], float]:
    """Train and evaluate LightGBM classifier."""
    import lightgbm as lgb
    
    lgb_device = "gpu" if device in ["cuda", "gpu"] else "cpu"
    logger.info(
        "Training LightGBM (n_estimators=%d, max_depth=%d, lr=%.3f, device='%s')...",
        n_estimators, max_depth, learning_rate, lgb_device
    )
    
    callbacks = [lgb.early_stopping(stopping_rounds=20, verbose=False)]
    
    model = lgb.LGBMClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        subsample=0.85,
        colsample_bytree=0.85,
        device=lgb_device,
        random_state=42,
        n_jobs=-1 if lgb_device == "cpu" else None,
        verbose=-1,
    )
    
    start_t = time.time()
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        eval_metric="auc",
        callbacks=callbacks,
    )
    train_duration = time.time() - start_t
    logger.info("LightGBM training completed in %.2f seconds", train_duration)
    
    metrics = evaluate_model(model, X_test, y_test, model_name="LightGBM")
    metrics["train_duration_sec"] = round(train_duration, 2)
    return model, metrics, train_duration


def evaluate_model(
    model: Any,
    X_test: pd.DataFrame,
    y_test: pd.Series,
    model_name: str = "Model",
) -> Dict[str, Any]:
    """Calculate comprehensive evaluation metrics."""
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    y_pred = (y_pred_proba >= 0.50).astype(int)
    
    roc_auc = float(roc_auc_score(y_test, y_pred_proba))
    acc = float(accuracy_score(y_test, y_pred))
    prec_1 = float(precision_score(y_test, y_pred, pos_label=1, zero_division=0))
    rec_1 = float(recall_score(y_test, y_pred, pos_label=1, zero_division=0))
    f1_1 = float(f1_score(y_test, y_pred, pos_label=1, zero_division=0))
    
    prec_macro = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
    
    cm = confusion_matrix(y_test, y_pred).tolist()
    cls_report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    
    logger.info("================ %s Evaluation Results ================", model_name)
    logger.info("ROC-AUC Score:      %.4f", roc_auc)
    logger.info("Accuracy:           %.4f", acc)
    logger.info("Precision (ADR=1):  %.4f", prec_1)
    logger.info("Recall (ADR=1):     %.4f", rec_1)
    logger.info("F1-Score (ADR=1):   %.4f", f1_1)
    logger.info("Confusion Matrix:   TN=%s, FP=%s | FN=%s, TP=%s", cm[0][0], cm[0][1], cm[1][0], cm[1][1])
    logger.info("=========================================================")
    
    return {
        "model_name": model_name,
        "roc_auc": round(roc_auc, 5),
        "accuracy": round(acc, 5),
        "precision_adr": round(prec_1, 5),
        "recall_adr": round(rec_1, 5),
        "f1_score_adr": round(f1_1, 5),
        "precision_macro": round(prec_macro, 5),
        "recall_macro": round(rec_macro, 5),
        "f1_score_macro": round(f1_macro, 5),
        "confusion_matrix": cm,
        "classification_report": cls_report,
    }


def save_artifacts(
    model: Any,
    best_metrics: Dict[str, Any],
    frequency_maps: Dict[str, Any],
    X_train: pd.DataFrame,
    output_dir: Path,
    benchmark_report: Optional[Dict[str, Any]] = None,
) -> None:
    """Save trained model, feature metadata, lookup maps, and reports."""
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Save Model Artifact
    model_path = output_dir / "nyaya_setu_model.joblib"
    logger.info("Saving trained model to %s ...", model_path)
    joblib.dump(model, model_path, compress=3)
    
    # 2. Save Frequency Maps
    freq_path = output_dir / "frequency_maps.json"
    logger.info("Saving categorical frequency maps to %s ...", freq_path)
    with open(freq_path, "w", encoding="utf-8") as f:
        json.dump(frequency_maps, f, indent=2)
        
    # 3. Save SHAP Background Sample (500 representative rows for fast TreeSHAP explainability)
    shap_sample = X_train.sample(n=min(500, len(X_train)), random_state=42)
    shap_path = output_dir / "shap_background.joblib"
    logger.info("Saving SHAP background dataset (%d rows) to %s ...", len(shap_sample), shap_path)
    joblib.dump(shap_sample, shap_path)
    
    # 4. Save Metadata & Config
    metadata = {
        "version": "1.0.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "model_name": best_metrics["model_name"],
        "features": NUMERICAL_FEATURES,
        "target": TARGET_COL,
        "decision_thresholds": {
            "lok_adalat_threshold": 0.65,  # Score >= 65% -> Highly suitable for Lok Adalat
            "mediation_threshold": 0.40,   # 40% <= Score < 65% -> Mediation
            "trial_threshold": 0.40,       # Score < 40% -> Regular Trial
        },
        "metrics": best_metrics,
        "benchmark_summary": benchmark_report or {},
    }
    
    meta_path = output_dir / "metadata.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
        
    # 5. Save Human-Readable Evaluation Report
    report_md_path = output_dir / "evaluation_report.md"
    with open(report_md_path, "w", encoding="utf-8") as f:
        f.write(f"# Nyaya Setu - Model Evaluation Report\n\n")
        f.write(f"- **Generated At**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}\n")
        f.write(f"- **Selected Model**: `{best_metrics['model_name']}`\n")
        f.write(f"- **ROC-AUC**: `{best_metrics['roc_auc']:.4f}`\n")
        f.write(f"- **Accuracy**: `{best_metrics['accuracy']:.4f}`\n")
        f.write(f"- **Precision (ADR)**: `{best_metrics['precision_adr']:.4f}`\n")
        f.write(f"- **Recall (ADR)**: `{best_metrics['recall_adr']:.4f}`\n")
        f.write(f"- **F1-Score (ADR)**: `{best_metrics['f1_score_adr']:.4f}`\n\n")
        f.write(f"### Confusion Matrix\n\n")
        cm = best_metrics["confusion_matrix"]
        f.write(f"| | Predicted Dismissal (0) | Predicted Lok Adalat (1) |\n")
        f.write(f"|---|---|---|\n")
        f.write(f"| **Actual Dismissal (0)** | {cm[0][0]:,} (TN) | {cm[0][1]:,} (FP) |\n")
        f.write(f"| **Actual Lok Adalat (1)** | {cm[1][0]:,} (FN) | {cm[1][1]:,} (TP) |\n\n")
        if benchmark_report:
            f.write(f"### Benchmark Comparison\n\n")
            f.write(f"| Metric | XGBoost | LightGBM |\n")
            f.write(f"|---|---|---|\n")
            f.write(f"| ROC-AUC | {benchmark_report.get('xgboost', {}).get('roc_auc', 'N/A')} | {benchmark_report.get('lightgbm', {}).get('roc_auc', 'N/A')} |\n")
            f.write(f"| F1 (ADR) | {benchmark_report.get('xgboost', {}).get('f1_score_adr', 'N/A')} | {benchmark_report.get('lightgbm', {}).get('f1_score_adr', 'N/A')} |\n")
            f.write(f"| Training Time | {benchmark_report.get('xgboost', {}).get('train_duration_sec', 'N/A')}s | {benchmark_report.get('lightgbm', {}).get('train_duration_sec', 'N/A')}s |\n")
            
    logger.info("All artifacts successfully persisted to %s", output_dir)


def main():
    parser = argparse.ArgumentParser(description="Nyaya Setu - Standalone Model Training & Benchmarking Pipeline")
    parser.add_argument("--data-path", type=str, default=None, help="Path to nyaya_setu_clean.parquet or nyaya_setu_clean.csv")
    parser.add_argument("--model-type", type=str, default="benchmark", choices=["xgboost", "lightgbm", "benchmark"], help="Model to train or benchmark")
    parser.add_argument("--device", type=str, default="cpu", choices=["cpu", "cuda", "gpu"], help="Compute device (cpu, cuda, or gpu)")
    parser.add_argument("--sample-size", type=int, default=1000000, help="Number of rows for stratified sample (default: 10 Lakh = 1000000, use -1 for full dataset)")
    parser.add_argument("--output-dir", type=str, default="artifacts", help="Directory to save model artifacts")
    parser.add_argument("--random-state", type=int, default=42, help="Random state seed")
    parser.add_argument("--n-estimators", type=int, default=250, help="Number of gradient boosted trees")
    parser.add_argument("--max-depth", type=int, default=6, help="Maximum tree depth")
    parser.add_argument("--learning-rate", type=float, default=0.08, help="Learning rate")
    
    args = parser.parse_args()
    
    logger.info("=== Starting Nyaya Setu Training Pipeline ===")
    logger.info("Arguments: %s", vars(args))
    
    data_file = find_dataset(args.data_path)
    output_dir = Path(args.output_dir).resolve()
    
    # 1. Load, sample, and compute frequency maps
    df, frequency_maps = load_and_preprocess_data(
        data_file,
        sample_size=args.sample_size,
        random_state=args.random_state,
    )
    
    # 2. Train/test split
    X_train, X_test, y_train, y_test = split_data(
        df,
        test_size=0.20,
        random_state=args.random_state,
    )
    
    # 3. Model Training & Benchmarking
    best_model = None
    best_metrics = None
    benchmark_report = {}
    
    if args.model_type in ["xgboost", "benchmark"]:
        xgb_model, xgb_metrics, _ = train_xgboost(
            X_train, y_train, X_test, y_test,
            device=args.device,
            n_estimators=args.n_estimators,
            max_depth=args.max_depth,
            learning_rate=args.learning_rate,
        )
        benchmark_report["xgboost"] = xgb_metrics
        best_model = xgb_model
        best_metrics = xgb_metrics
        
    if args.model_type in ["lightgbm", "benchmark"]:
        lgb_model, lgb_metrics, _ = train_lightgbm(
            X_train, y_train, X_test, y_test,
            device=args.device,
            n_estimators=args.n_estimators,
            max_depth=args.max_depth,
            learning_rate=args.learning_rate,
        )
        benchmark_report["lightgbm"] = lgb_metrics
        
        # In benchmark mode, compare ROC-AUC and F1 to choose the winning model
        if args.model_type == "benchmark":
            if lgb_metrics["roc_auc"] > xgb_metrics["roc_auc"]:
                logger.info("LightGBM outperformed XGBoost (ROC-AUC: %.4f vs %.4f). Selecting LightGBM.", lgb_metrics['roc_auc'], xgb_metrics['roc_auc'])
                best_model = lgb_model
                best_metrics = lgb_metrics
            else:
                logger.info("XGBoost achieved equal or superior ROC-AUC (%.4f vs %.4f). Selecting XGBoost.", xgb_metrics['roc_auc'], lgb_metrics['roc_auc'])
                best_model = xgb_model
                best_metrics = xgb_metrics
        else:
            best_model = lgb_model
            best_metrics = lgb_metrics
            
    # 4. Persist Artifacts
    save_artifacts(
        model=best_model,
        best_metrics=best_metrics,
        frequency_maps=frequency_maps,
        X_train=X_train,
        output_dir=output_dir,
        benchmark_report=benchmark_report if args.model_type == "benchmark" else None,
    )
    
    logger.info("=== Nyaya Setu Training Pipeline Completed Successfully! ===")


if __name__ == "__main__":
    main()
