#!/usr/bin/env python3
"""
Nyaya Setu - Model Training & Evaluation Pipeline
==================================================
Standalone ML pipeline for ADR suitability ranking.

Evaluation hygiene (why this differs from the first version):
  * Three-way stratified split: train (fit) / validation (early stopping, threshold
    choice) / test (scored exactly once).
  * Categorical frequency maps are built from the TRAIN split only.
  * Only statutory-eligible rows are modelled -- the rule engine excludes the rest
    before the model is ever called, so training on them is train/serve skew.
  * Geography identifiers (state/district/court) are excluded by default. They let a
    tree model memorise "which court's data-entry convention produced this label"
    instead of learning anything about the dispute (see the leakage audit).
  * A leakage audit (single-feature AUCs, geography-only baseline, geo ablation) and a
    leave-state-out generalisation check are run and written into the report. A
    near-perfect score triggers an explicit warning instead of a celebration.

Usage:
    python train.py --data-path path/to/nyaya_setu_clean.csv --sample-size 1000000
    python train.py --device cuda --model-type xgboost
    NYAYA_DATA_PATH=/data/nyaya_setu_clean.parquet python train.py
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    brier_score_loss,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import GroupKFold, train_test_split
from sklearn.tree import DecisionTreeClassifier

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("NyayaSetuTrainer")

# All columns the dataset provides / the API accepts.
ALL_FEATURES = [
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

# Location identifiers: a shortcut to dataset-source artefacts, not legal signal.
GEO_FEATURES = ["state_code", "dist_code", "court_no"]

# Handled by the rule engine before the model runs, so constant (=1) at inference.
GATE_FEATURES = ["statutory_eligible"]

DEFAULT_FEATURES = [f for f in ALL_FEATURES if f not in GEO_FEATURES + GATE_FEATURES]

TARGET_COL = "is_adr_target"
GROUP_COL = "state_code"

# A feature that alone ranks held-out cases this well is almost certainly leaking
# the label (or is a proxy for the data source), not describing the dispute.
SINGLE_FEATURE_AUC_WARN = 0.90
SUSPICIOUS_TEST_AUC = 0.98


def find_dataset(custom_path: Optional[str] = None) -> Path:
    """Locate the clean dataset (parquet or csv): --data-path, $NYAYA_DATA_PATH, or repo root."""
    candidates: List[Path] = []
    if custom_path:
        candidates.append(Path(custom_path))
    if os.environ.get("NYAYA_DATA_PATH"):
        candidates.append(Path(os.environ["NYAYA_DATA_PATH"]))

    root = Path(__file__).resolve().parent
    for base in (root, root.parent):
        candidates.append(base / "nyaya_setu_clean.parquet")
        candidates.append(base / "nyaya_setu_clean.csv")

    for path in candidates:
        if path.exists() and path.is_file():
            logger.info("Found dataset at: %s (%.2f MB)", path, path.stat().st_size / (1024 * 1024))
            return path

    raise FileNotFoundError(
        f"Dataset not found. Searched: {[str(p) for p in candidates]}. "
        "Pass --data-path or set NYAYA_DATA_PATH."
    )


def load_data(data_path: Path, sample_size: int = 1000000, random_state: int = 42) -> pd.DataFrame:
    """Load the dataset and optionally take a stratified sample. No statistics are computed here."""
    logger.info("Loading dataset from %s ...", data_path)
    t0 = time.time()

    if data_path.suffix.lower() == ".parquet":
        df = pd.read_parquet(data_path)
    else:
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

    logger.info("Loaded %d rows x %d cols in %.2fs", len(df), len(df.columns), time.time() - t0)

    if 0 < sample_size < len(df):
        logger.info("Stratified sample of %d rows (%.1f%%)", sample_size, 100 * sample_size / len(df))
        df, _ = train_test_split(
            df,
            train_size=sample_size,
            stratify=df[TARGET_COL],
            random_state=random_state,
        )
        df = df.reset_index(drop=True)
    return df


def split_data(
    df: pd.DataFrame,
    val_size: float = 0.15,
    test_size: float = 0.15,
    random_state: int = 42,
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Stratified train / validation / test split (default 70/15/15) of whole rows."""
    train_df, hold_df = train_test_split(
        df,
        test_size=val_size + test_size,
        stratify=df[TARGET_COL],
        random_state=random_state,
    )
    val_df, test_df = train_test_split(
        hold_df,
        test_size=test_size / (val_size + test_size),
        stratify=hold_df[TARGET_COL],
        random_state=random_state,
    )
    for name, part in (("Train", train_df), ("Validation", val_df), ("Test", test_df)):
        logger.info("%-10s %8d rows | ADR positive rate %.2f%%", name, len(part), 100 * part[TARGET_COL].mean())
    return train_df, val_df, test_df


def _norm(series: pd.Series) -> pd.Series:
    return series.astype(str).str.lower().str.strip()


def build_frequency_maps(train_df: pd.DataFrame) -> Dict[str, Any]:
    """Frequency lookup tables from the TRAIN split only (no test information)."""
    n = len(train_df)
    type_freq = _norm(train_df["type_name_val"]).value_counts() / n
    purpose_freq = _norm(train_df["purpose_name_val"]).value_counts() / n

    return {
        "type_name_val_freq_map": {k: float(v) for k, v in type_freq.items()},
        "purpose_name_val_freq_map": {k: float(v) for k, v in purpose_freq.items()},
        "default_type_freq": float(type_freq.median()),
        "default_purpose_freq": float(purpose_freq.median()),
        "default_judge_position_freq": float(train_df["judge_position_freq"].median()),
        "total_dataset_rows": int(n),
        "fit_on": "train_split_only",
    }


def apply_frequency_maps(df: pd.DataFrame, maps: Dict[str, Any]) -> pd.DataFrame:
    """Re-encode the frequency features from raw strings with the train-only maps."""
    out = df.copy()
    out["type_name_val_freq"] = (
        _norm(out["type_name_val"]).map(maps["type_name_val_freq_map"]).fillna(maps["default_type_freq"]).astype("float32")
    )
    out["purpose_name_val_freq"] = (
        _norm(out["purpose_name_val"]).map(maps["purpose_name_val_freq_map"]).fillna(maps["default_purpose_freq"]).astype("float32")
    )
    return out


# --------------------------------------------------------------------------- models
def make_model(kind: str, device: str, n_estimators: int, max_depth: int, learning_rate: float, early_stop: bool):
    if kind == "xgboost":
        import xgboost as xgb

        use_cuda = device in ("cuda", "gpu")
        return xgb.XGBClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            learning_rate=learning_rate,
            subsample=0.85,
            colsample_bytree=0.85,
            min_child_weight=5,
            reg_lambda=5.0,
            tree_method="hist",
            device="cuda" if use_cuda else "cpu",
            random_state=42,
            eval_metric="auc",
            early_stopping_rounds=20 if early_stop else None,
            n_jobs=None if use_cuda else -1,
        )
    import lightgbm as lgb

    return lgb.LGBMClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        learning_rate=learning_rate,
        subsample=0.85,
        subsample_freq=1,
        colsample_bytree=0.85,
        min_child_samples=50,
        reg_lambda=5.0,
        device="gpu" if device in ("cuda", "gpu") else "cpu",
        random_state=42,
        n_jobs=None if device in ("cuda", "gpu") else -1,
        verbose=-1,
    )


def fit_model(kind: str, model: Any, X_tr, y_tr, X_va, y_va) -> Any:
    """Fit with early stopping on the VALIDATION split (never the test split)."""
    if kind == "xgboost":
        model.fit(X_tr, y_tr, eval_set=[(X_va, y_va)], verbose=False)
    else:
        import lightgbm as lgb

        model.fit(
            X_tr, y_tr,
            eval_set=[(X_va, y_va)],
            eval_metric="auc",
            callbacks=[lgb.early_stopping(stopping_rounds=20, verbose=False)],
        )
    return model


def best_n_trees(kind: str, model: Any) -> int:
    if kind == "xgboost":
        return int(getattr(model, "best_iteration", model.n_estimators - 1)) + 1
    return int(model.best_iteration_ or model.n_estimators)


def train_one(kind, features, splits, args) -> Tuple[Any, Dict[str, Any]]:
    X_tr, y_tr, X_va, y_va = splits["X_train"][features], splits["y_train"], splits["X_val"][features], splits["y_val"]
    logger.info("Training %s on %d features: %s", kind, len(features), features)
    model = make_model(kind, args.device, args.n_estimators, args.max_depth, args.learning_rate, early_stop=True)
    t0 = time.time()
    fit_model(kind, model, X_tr, y_tr, X_va, y_va)
    duration = time.time() - t0
    logger.info("%s finished in %.2fs (best trees: %d)", kind, duration, best_n_trees(kind, model))
    return model, {"train_duration_sec": round(duration, 2), "best_n_trees": best_n_trees(kind, model)}


# ------------------------------------------------------------------------ evaluation
def pick_threshold(y_true: pd.Series, proba: np.ndarray) -> float:
    """Decision threshold that maximises macro-F1 on the VALIDATION split."""
    best_t, best_f = 0.5, -1.0
    for t in np.linspace(0.05, 0.95, 91):
        f = f1_score(y_true, (proba >= t).astype(int), average="macro", zero_division=0)
        if f > best_f:
            best_t, best_f = float(t), float(f)
    return round(best_t, 2)


def evaluate_model(model: Any, X: pd.DataFrame, y: pd.Series, threshold: float, model_name: str) -> Dict[str, Any]:
    proba = model.predict_proba(X)[:, 1]
    pred = (proba >= threshold).astype(int)
    cm = confusion_matrix(y, pred, labels=[0, 1]).tolist()
    base_rate = float(y.mean())

    metrics = {
        "model_name": model_name,
        "threshold": threshold,
        "roc_auc": round(float(roc_auc_score(y, proba)), 5),
        "pr_auc": round(float(average_precision_score(y, proba)), 5),
        "brier_score": round(float(brier_score_loss(y, proba)), 5),
        "accuracy": round(float(accuracy_score(y, pred)), 5),
        "majority_class_accuracy": round(max(base_rate, 1 - base_rate), 5),
        "adr_base_rate": round(base_rate, 5),
        "precision_adr": round(float(precision_score(y, pred, zero_division=0)), 5),
        "recall_adr": round(float(recall_score(y, pred, zero_division=0)), 5),
        "f1_score_adr": round(float(f1_score(y, pred, zero_division=0)), 5),
        "precision_macro": round(float(precision_score(y, pred, average="macro", zero_division=0)), 5),
        "recall_macro": round(float(recall_score(y, pred, average="macro", zero_division=0)), 5),
        "f1_score_macro": round(float(f1_score(y, pred, average="macro", zero_division=0)), 5),
        "confusion_matrix": cm,
        "classification_report": classification_report(y, pred, output_dict=True, zero_division=0),
    }
    logger.info(
        "[%s] TEST  AUC=%.4f  PR-AUC=%.4f  acc=%.4f (majority baseline %.4f)  F1(ADR)=%.4f  macro-F1=%.4f @ thr=%.2f",
        model_name, metrics["roc_auc"], metrics["pr_auc"], metrics["accuracy"],
        metrics["majority_class_accuracy"], metrics["f1_score_adr"], metrics["f1_score_macro"], threshold,
    )
    return metrics


def single_feature_auc(X_tr, y_tr, X_va, y_va, columns: List[str]) -> Dict[str, float]:
    """Validation AUC of a shallow tree that sees ONE feature (or one group) only."""
    tree = DecisionTreeClassifier(max_depth=6, min_samples_leaf=50, random_state=0)
    tree.fit(X_tr[columns], y_tr)
    return round(float(roc_auc_score(y_va, tree.predict_proba(X_va[columns])[:, 1])), 4)


def leakage_audit(splits: Dict[str, Any], features: List[str], model_kind: str, args) -> Dict[str, Any]:
    """Quantify how much of the score comes from suspicious signals."""
    X_tr, y_tr, X_va, y_va = splits["X_train"], splits["y_train"], splits["X_val"], splits["y_val"]
    audit: Dict[str, Any] = {"single_feature_auc": {}, "warnings": []}

    for col in ALL_FEATURES:
        if col in X_tr.columns:
            audit["single_feature_auc"][col] = single_feature_auc(X_tr, y_tr, X_va, y_va, [col])
    audit["single_feature_auc"] = dict(sorted(audit["single_feature_auc"].items(), key=lambda kv: -kv[1]))

    geo = [c for c in GEO_FEATURES if c in X_tr.columns]
    audit["geography_only_auc"] = single_feature_auc(X_tr, y_tr, X_va, y_va, geo) if geo else None

    for col, auc in audit["single_feature_auc"].items():
        if auc >= SINGLE_FEATURE_AUC_WARN:
            audit["warnings"].append(
                f"`{col}` alone reaches validation AUC {auc:.3f} - likely a label proxy or data-source artefact."
            )

    # Ablation: how much better does the model look if it may use location identifiers?
    if geo and not set(geo).issubset(features):
        with_geo = features + [c for c in geo if c not in features]
        model, _ = train_one(model_kind, with_geo, splits, args)
        auc_geo = float(roc_auc_score(y_va, model.predict_proba(X_va[with_geo])[:, 1]))
        audit["val_auc_with_geo_features"] = round(auc_geo, 4)
        imp = dict(zip(with_geo, map(float, model.feature_importances_)))
        audit["feature_importance_with_geo"] = {k: round(v, 4) for k, v in sorted(imp.items(), key=lambda kv: -kv[1])}
        top = max(imp, key=imp.get)
        if top in geo and imp[top] > 0.5:
            audit["warnings"].append(
                f"With geography allowed, `{top}` carries {imp[top]:.0%} of model importance: the label tracks "
                "where the record came from, not the dispute."
            )
    return audit


def group_generalisation(splits, features, model_kind, n_trees, args, max_rows: int = 300000) -> Optional[Dict[str, Any]]:
    """Leave-states-out CV: can the model rank cases from states it has never seen?"""
    if GROUP_COL not in splits["X_train"].columns:
        return None
    X = pd.concat([splits["X_train"], splits["X_val"]])
    y = pd.concat([splits["y_train"], splits["y_val"]])
    if X[GROUP_COL].nunique() < 3:
        return None
    if len(X) > max_rows:
        idx = np.random.RandomState(42).choice(len(X), max_rows, replace=False)
        X, y = X.iloc[idx], y.iloc[idx]

    n_splits = min(5, X[GROUP_COL].nunique())
    aucs: List[float] = []
    for fold, (tr, te) in enumerate(GroupKFold(n_splits=n_splits).split(X, y, groups=X[GROUP_COL])):
        if y.iloc[te].nunique() < 2 or y.iloc[tr].nunique() < 2:
            continue
        model = make_model(model_kind, args.device, n_trees, args.max_depth, args.learning_rate, early_stop=False)
        model.fit(X.iloc[tr][features], y.iloc[tr])
        aucs.append(float(roc_auc_score(y.iloc[te], model.predict_proba(X.iloc[te][features])[:, 1])))
    if not aucs:
        return None
    logger.info("Leave-state-out AUC per fold: %s", [round(a, 4) for a in aucs])
    return {
        "n_folds": len(aucs),
        "auc_per_fold": [round(a, 4) for a in aucs],
        "auc_mean": round(float(np.mean(aucs)), 4),
        "auc_min": round(float(np.min(aucs)), 4),
    }


# ------------------------------------------------------------------------ artifacts
def save_artifacts(
    model: Any,
    features: List[str],
    best_metrics: Dict[str, Any],
    frequency_maps: Dict[str, Any],
    X_train: pd.DataFrame,
    output_dir: Path,
    benchmark_report: Optional[Dict[str, Any]],
    audit: Dict[str, Any],
    group_cv: Optional[Dict[str, Any]],
    data_info: Dict[str, Any],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(model, output_dir / "nyaya_setu_model.joblib", compress=3)

    frequency_maps = {**frequency_maps, "features": features}
    with open(output_dir / "frequency_maps.json", "w", encoding="utf-8") as f:
        json.dump(frequency_maps, f, indent=2)

    shap_sample = X_train[features].sample(n=min(500, len(X_train)), random_state=42)
    joblib.dump(shap_sample, output_dir / "shap_background.joblib")

    suspicious = best_metrics["roc_auc"] >= SUSPICIOUS_TEST_AUC or bool(audit["warnings"])
    caveats = [
        "Labels are historical outcomes (is_adr_target); the model predicts historical patterns, "
        "not what is legally or ethically right.",
        "The model is tabular only (XGBoost/LightGBM). No text or language model is used.",
        "Advisory screening tool: a human DLSA decision-maker makes the referral.",
    ]
    if suspicious:
        caveats.insert(0, "LEAKAGE SUSPECTED - see leakage_audit. Do not present these scores as real-world accuracy.")

    metadata = {
        "version": "2.0.0",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "model_name": best_metrics["model_name"],
        "features": features,
        "excluded_features": [f for f in ALL_FEATURES if f not in features],
        "target": TARGET_COL,
        "decision_thresholds": {
            "lok_adalat_threshold": 0.65,
            "mediation_threshold": 0.40,
            "trial_threshold": 0.40,
            "validation_tuned_binary_threshold": best_metrics["threshold"],
        },
        "data": data_info,
        "metrics": best_metrics,
        "benchmark_summary": benchmark_report or {},
        "leakage_audit": audit,
        "leave_state_out_cv": group_cv,
        "caveats": caveats,
    }
    with open(output_dir / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    write_report(output_dir / "evaluation_report.md", best_metrics, benchmark_report, audit, group_cv, data_info, caveats, features)
    logger.info("Artifacts written to %s", output_dir)


def write_report(path, m, bench, audit, group_cv, data_info, caveats, features) -> None:
    cm = m["confusion_matrix"]
    L: List[str] = [
        "# Nyaya Setu - Model Evaluation Report\n",
        f"- **Generated At**: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"- **Selected Model**: `{m['model_name']}`",
        f"- **Features used ({len(features)})**: {', '.join(f'`{f}`' for f in features)}",
        f"- **Split**: train {data_info['n_train']:,} / validation {data_info['n_val']:,} / test {data_info['n_test']:,} "
        "(stratified; early stopping and threshold use validation only; test scored once)",
        f"- **Frequency maps fit on**: train split only\n",
        "## Held-out test results\n",
        "| Metric | Value |", "|---|---|",
        f"| ROC-AUC | {m['roc_auc']:.4f} |",
        f"| PR-AUC | {m['pr_auc']:.4f} (ADR base rate {m['adr_base_rate']:.3f}) |",
        f"| Accuracy | {m['accuracy']:.4f} (always-predict-majority = {m['majority_class_accuracy']:.4f}) |",
        f"| Precision / Recall / F1 (ADR) | {m['precision_adr']:.4f} / {m['recall_adr']:.4f} / {m['f1_score_adr']:.4f} |",
        f"| Macro F1 | {m['f1_score_macro']:.4f} |",
        f"| Brier score | {m['brier_score']:.4f} |",
        f"| Decision threshold (validation-tuned) | {m['threshold']:.2f} |\n",
        "### Confusion matrix (test)\n",
        "| | Predicted Not-ADR (0) | Predicted ADR (1) |", "|---|---|---|",
        f"| **Actual 0** | {cm[0][0]:,} (TN) | {cm[0][1]:,} (FP) |",
        f"| **Actual 1** | {cm[1][0]:,} (FN) | {cm[1][1]:,} (TP) |\n",
    ]
    if bench:
        L += ["### Benchmark (test)\n", "| Metric | XGBoost | LightGBM |", "|---|---|---|"]
        for label, key in (("ROC-AUC", "roc_auc"), ("PR-AUC", "pr_auc"), ("F1 (ADR)", "f1_score_adr"),
                           ("Train time (s)", "train_duration_sec")):
            L.append(f"| {label} | {bench.get('xgboost', {}).get(key, 'N/A')} | {bench.get('lightgbm', {}).get(key, 'N/A')} |")
        L.append("")

    L += ["## Leakage audit\n", "Validation AUC of a shallow tree seeing ONE feature at a time:\n",
          "| Feature | Single-feature AUC |", "|---|---|"]
    for k, v in audit["single_feature_auc"].items():
        L.append(f"| `{k}` | {v:.3f} |")
    if audit.get("geography_only_auc") is not None:
        L.append(f"\n- Geography-only (state+district+court) AUC: **{audit['geography_only_auc']:.3f}**")
    if "val_auc_with_geo_features" in audit:
        L.append(f"- Validation AUC if geography IDs are allowed: **{audit['val_auc_with_geo_features']:.3f}**")
    L.append("")
    L += [f"> WARNING: {w}" for w in audit["warnings"]] or ["No single feature or geography shortcut exceeded warning thresholds."]
    L.append("")

    if group_cv:
        L += ["## Leave-state-out generalisation\n",
              "Train on some states, score entirely unseen states:\n",
              f"- Mean AUC **{group_cv['auc_mean']:.3f}**, worst fold **{group_cv['auc_min']:.3f}** "
              f"(per fold: {group_cv['auc_per_fold']})\n"]

    L += ["## Caveats\n"] + [f"- {c}" for c in caveats] + [""]
    path.write_text("\n".join(L), encoding="utf-8")


# ------------------------------------------------------------------------------ main
def resolve_features(args) -> List[str]:
    feats = list(DEFAULT_FEATURES)
    if args.include_geo:
        feats += [f for f in GEO_FEATURES if f not in feats]
    for f in args.drop_features or []:
        if f in feats:
            feats.remove(f)
    # Keep canonical order so inference matches.
    return [f for f in ALL_FEATURES if f in feats]


def main():
    p = argparse.ArgumentParser(description="Nyaya Setu - Model Training, Leakage Audit & Benchmarking")
    p.add_argument("--data-path", type=str, default=None, help="Path to nyaya_setu_clean.parquet/.csv (or set NYAYA_DATA_PATH)")
    p.add_argument("--model-type", default="benchmark", choices=["xgboost", "lightgbm", "benchmark"])
    p.add_argument("--device", default="cpu", choices=["cpu", "cuda", "gpu"])
    p.add_argument("--sample-size", type=int, default=1000000, help="Stratified sample size (<=0 = full dataset)")
    p.add_argument("--output-dir", type=str, default="artifacts")
    p.add_argument("--random-state", type=int, default=42)
    p.add_argument("--n-estimators", type=int, default=250)
    p.add_argument("--max-depth", type=int, default=6)
    p.add_argument("--learning-rate", type=float, default=0.08)
    p.add_argument("--val-size", type=float, default=0.15)
    p.add_argument("--test-size", type=float, default=0.15)
    p.add_argument("--include-geo", action="store_true", help="Allow state/district/court IDs as features (NOT recommended)")
    p.add_argument("--drop-features", nargs="*", default=[], help="Extra features to exclude, e.g. case_age_days")
    p.add_argument("--keep-ineligible", action="store_true", help="Also train on statutory_eligible==0 rows")
    p.add_argument("--skip-audit", action="store_true", help="Skip leakage ablation and leave-state-out CV")
    args = p.parse_args()

    logger.info("=== Nyaya Setu Training Pipeline ===")
    logger.info("Arguments: %s", vars(args))

    df = load_data(find_dataset(args.data_path), args.sample_size, args.random_state)

    if not args.keep_ineligible and "statutory_eligible" in df.columns:
        before = len(df)
        df = df[df["statutory_eligible"] == 1].reset_index(drop=True)
        logger.info("Modelling statutory-eligible cases only: %d of %d rows kept", len(df), before)

    train_df, val_df, test_df = split_data(df, args.val_size, args.test_size, args.random_state)

    freq_maps = build_frequency_maps(train_df)
    train_df, val_df, test_df = (apply_frequency_maps(d, freq_maps) for d in (train_df, val_df, test_df))

    features = resolve_features(args)
    keep = list(dict.fromkeys(ALL_FEATURES))
    splits = {
        "X_train": train_df[keep], "y_train": train_df[TARGET_COL],
        "X_val": val_df[keep], "y_val": val_df[TARGET_COL],
        "X_test": test_df[keep], "y_test": test_df[TARGET_COL],
    }

    kinds = ["xgboost", "lightgbm"] if args.model_type == "benchmark" else [args.model_type]
    results: Dict[str, Tuple[Any, Dict[str, Any], float]] = {}
    for kind in kinds:
        model, info = train_one(kind, features, splits, args)
        val_proba = model.predict_proba(splits["X_val"][features])[:, 1]
        thr = pick_threshold(splits["y_val"], val_proba)
        name = "XGBoost" if kind == "xgboost" else "LightGBM"
        metrics = evaluate_model(model, splits["X_test"][features], splits["y_test"], thr, name)
        metrics.update(info)
        results[kind] = (model, metrics, float(roc_auc_score(splits["y_val"], val_proba)))

    # Select on VALIDATION AUC so the test split plays no role in model choice.
    best_kind = max(results, key=lambda k: results[k][2])
    best_model, best_metrics, _ = results[best_kind]
    logger.info("Selected %s by validation AUC", best_metrics["model_name"])
    benchmark = {k: v[1] for k, v in results.items()} if args.model_type == "benchmark" else None

    if args.skip_audit:
        audit, group_cv = {"single_feature_auc": {}, "warnings": ["Audit skipped."]}, None
    else:
        audit = leakage_audit(splits, features, best_kind, args)
        group_cv = group_generalisation(splits, features, best_kind, best_metrics["best_n_trees"], args)
        if group_cv and group_cv["auc_mean"] < best_metrics["roc_auc"] - 0.10:
            audit["warnings"].append(
                f"Leave-state-out AUC ({group_cv['auc_mean']:.3f}) is far below the random-split AUC "
                f"({best_metrics['roc_auc']:.3f}): the model does not transfer across states."
            )
    if best_metrics["roc_auc"] >= SUSPICIOUS_TEST_AUC:
        audit["warnings"].append(
            f"Test AUC {best_metrics['roc_auc']:.4f} is implausibly high for court-outcome data; "
            "check how `is_adr_target` was derived (e.g. from disp_name_val) and whether any feature encodes it."
        )
    for w in audit["warnings"]:
        logger.warning("AUDIT: %s", w)

    data_info = {
        "n_total_modelled": int(len(df)),
        "n_train": int(len(train_df)),
        "n_val": int(len(val_df)),
        "n_test": int(len(test_df)),
        "statutory_eligible_only": not args.keep_ineligible,
        "frequency_maps_fit_on": "train_split_only",
    }

    save_artifacts(
        model=best_model,
        features=features,
        best_metrics=best_metrics,
        frequency_maps=freq_maps,
        X_train=splits["X_train"],
        output_dir=Path(args.output_dir).resolve(),
        benchmark_report=benchmark,
        audit=audit,
        group_cv=group_cv,
        data_info=data_info,
    )
    logger.info("=== Done ===")


if __name__ == "__main__":
    main()
