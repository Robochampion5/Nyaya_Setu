"""
Smoke tests for the training pipeline (train.py) on synthetic data.

The real dataset (nyaya_setu_clean.csv) is not part of the repository, so these tests
build a small synthetic frame with the same schema.
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
TRAIN = ROOT / "train.py"

TYPES = ["ni act", "s.c.c.", "mcop", "civil suit", "cri. case", "matrimonial"]
PURPOSES = ["appearance", "evidence", "arguments", "summons", "hearing"]


def make_dataset(n: int = 6000, state_shortcut: bool = False, seed: int = 0) -> pd.DataFrame:
    rng = np.random.RandomState(seed)
    state = rng.choice([1, 2, 3, 4, 5, 6, 7, 23], n)
    typ = rng.choice(TYPES, n)
    age = rng.exponential(300, n).astype("float32")
    signal = (np.isin(typ, ["ni act", "mcop", "s.c.c."]) * 1.2) + (age > 400) * 0.6 + rng.normal(0, 1.5, n)
    y = (signal > 0.7).astype(int)
    if state_shortcut:  # label determined by record source, like the shipped model
        y = (state != 23).astype(int)
    return pd.DataFrame({
        "state_code": state,
        "dist_code": rng.randint(1, 30, n),
        "court_no": rng.randint(1, 20, n),
        "type_name_val": typ,
        "purpose_name_val": rng.choice(PURPOSES, n),
        "disp_name_val": "x",
        "is_adr_target": y,
        "female_petitioner_clean": rng.randint(0, 2, n),
        "female_defendant_clean": rng.randint(0, 2, n),
        "has_female_adv_pet": rng.randint(0, 2, n),
        "has_female_adv_def": rng.randint(0, 2, n),
        "case_age_days": age,
        "first_listing_delay": rng.exponential(60, n).astype("float32"),
        "statutory_eligible": (rng.rand(n) > 0.1).astype(int),
        "type_name_val_freq": 0.1,
        "purpose_name_val_freq": 0.1,
        "judge_position_freq": rng.rand(n) * 0.2,
    })


def run_train(data: Path, out: Path, *extra: str):
    cmd = [sys.executable, str(TRAIN), "--data-path", str(data), "--sample-size", "-1",
           "--model-type", "xgboost", "--device", "cpu", "--output-dir", str(out), *extra]
    result = subprocess.run(cmd, capture_output=True, text=True)
    assert result.returncode == 0, f"Training failed:\n{result.stdout[-2000:]}\n{result.stderr[-2000:]}"
    return json.loads((out / "metadata.json").read_text(encoding="utf-8"))


def test_train_pipeline_smoke(tmp_path):
    data = tmp_path / "d.csv"
    make_dataset().to_csv(data, index=False)
    out = tmp_path / "art"
    meta = run_train(data, out)

    for name in ("nyaya_setu_model.joblib", "metadata.json", "frequency_maps.json",
                 "shap_background.joblib", "evaluation_report.md"):
        assert (out / name).exists(), name

    # Geography IDs and the statutory gate must not be model inputs by default.
    assert not {"state_code", "dist_code", "court_no", "statutory_eligible"} & set(meta["features"])
    assert meta["data"]["frequency_maps_fit_on"] == "train_split_only"
    assert meta["data"]["n_val"] > 0 and meta["data"]["n_test"] > 0
    assert 0.5 < meta["metrics"]["roc_auc"] < 0.98  # honest signal, not a perfect score


def test_leakage_audit_flags_state_shortcut(tmp_path):
    data = tmp_path / "leaky.csv"
    make_dataset(state_shortcut=True).to_csv(data, index=False)
    meta = run_train(data, tmp_path / "art")

    audit = meta["leakage_audit"]
    assert audit["geography_only_auc"] > 0.95
    assert audit["val_auc_with_geo_features"] > 0.95
    # Without geography the model has nothing real to learn here.
    assert meta["metrics"]["roc_auc"] < 0.7
    assert any("state_code" in w for w in audit["warnings"])
