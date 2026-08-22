"""
Smoke Test for Model Training Pipeline (train.py)
"""

import subprocess
import sys
from pathlib import Path


def test_train_pipeline_smoke():
    """Verify train.py executes without error and exports artifacts."""
    train_script = Path(__file__).resolve().parent.parent / "train.py"
    output_dir = Path(__file__).resolve().parent.parent / "artifacts_test"
    
    cmd = [
        sys.executable,
        str(train_script),
        "--sample-size", "1000",
        "--model-type", "xgboost",
        "--device", "cpu",
        "--output-dir", str(output_dir),
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    assert result.returncode == 0, f"Training failed with stderr: {result.stderr}"
    
    # Check that artifact files were created
    assert (output_dir / "nyaya_setu_model.joblib").exists()
    assert (output_dir / "metadata.json").exists()
    assert (output_dir / "frequency_maps.json").exists()
    assert (output_dir / "evaluation_report.md").exists()
    
    # Cleanup test output directory
    import shutil
    shutil.rmtree(output_dir, ignore_errors=True)

