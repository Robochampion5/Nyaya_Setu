# Nyaya Setu (न्याय सेतु) — ADR Suitability Screening System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![XGBoost](https://img.shields.io/badge/XGBoost-2.0+-FF6600?style=flat&logo=xgboost)](https://xgboost.readthedocs.io)
[![TreeSHAP](https://img.shields.io/badge/Explainability-TreeSHAP-4B8BBE?style=flat)](https://shap.readthedocs.io)
[![React](https://img.shields.io/badge/Frontend-React_18_%2B_Vite-61DAFB?style=flat&logo=react)](https://reactjs.org)
[![Compliance](https://img.shields.io/badge/Statutory-Section_89_CPC_%7C_Mediation_Act_2023-amber)](https://legislative.gov.in)

**Nyaya Setu** is an AI-powered Alternative Dispute Resolution (ADR) Suitability Screening System engineered for India's District Courts and District Legal Services Authorities (DLSAs). Under Section 89 of the Code of Civil Procedure (CPC) and the Mediation Act 2023, courts have a statutory mandate to identify disputes fit for conciliation, mediation, or Lok Adalat at early stages. Nyaya Setu replaces blunt blanket sweeps with a **Rule-First Statutory Filter + ML Suitability Ranking (XGBoost/LightGBM) + TreeSHAP Explainability Layer** tailored for DLSA Case Scrutiny Committees.

---

## System Architecture

```
Nyaya-Setu/
├── nyaya_setu_clean.csv         # DDL Judicial Data Portal dataset (~3.98M district filings)
├── cases_state_key.csv          # State code-name mapping table
├── cases_district_key.csv       # District code-name mapping table
├── cases_court_key.csv          # Court bench code-name mapping table
├── train.py                     # Standalone, self-contained ML training & benchmarking pipeline
├── train_requirements.txt       # Standalone dependencies for training (GPU & CPU ready)
├── artifacts/                   # Persisted production model and lookup tables
│   ├── nyaya_setu_model.joblib  # Trained XGBoost/LightGBM model artifact
│   ├── metadata.json            # Model schema, thresholds, and training metrics
│   ├── frequency_maps.json      # Categorical frequency encoding lookup tables
│   ├── shap_background.joblib   # SHAP background sample for TreeSHAP explainability
│   └── evaluation_report.md     # Precision, Recall, ROC-AUC, and Confusion Matrix
├── backend/                     # Modular FastAPI production service
│   ├── app/
│   │   ├── main.py              # FastAPI app factory, CORS, and lifespan artifact preloading
│   │   ├── core/
│   │   │   ├── config.py        # Pydantic BaseSettings and threshold configurations
│   │   │   └── rules.py         # Rule-First Mediation Act 2023 statutory filter
│   │   ├── schemas/
│   │   │   └── case.py          # Pydantic v2 schemas for requests, responses, and SHAP factors
│   │   ├── services/
│   │   │   ├── model_loader.py  # Singleton model and metadata manager
│   │   │   ├── inference.py     # End-to-end scoring pipeline (Rules -> ML -> SHAP)
│   │   │   └── explainer.py     # TreeSHAP and plain-English factor synthesis
│   │   └── api/
│   │       └── routes.py        # /score_case, /score_batch, /health, /reference_data
│   └── requirements.txt         # Backend Python dependencies
├── tests/                       # Automated unit and integration test suite
│   ├── test_rules.py            # Mediation Act 2023 statutory exclusion tests
│   ├── test_inference.py        # Inference pipeline and SHAP translation tests
│   ├── test_api.py              # FastAPI endpoint contracts and validation tests
│   └── test_train_smoke.py      # End-to-end training pipeline smoke test
└── Nyaya_Setu/
    └── frontend/                # GovTech DLSA Case Scrutiny UI (React + Vite + Tailwind)
        ├── src/
        │   ├── components/      # Single case scrutiny, Score gauge, SHAP waterfall, Cause list
        │   ├── services/api.js  # FastAPI client with error handling
        │   └── data/presets.js  # Real District Court filing presets
        ├── package.json
        └── vite.config.js
```

---

## 1. Model Training Pipeline (`train.py`)

The training script `train.py` is **self-contained and decoupled** from the API service. By default, it trains on a **10 Lakh (1,000,000) stratified sample** of district court filings with an 80/20 train/test split.

### Running Locally on CPU (Smoke Test or 10L Training)
```bash
# 1. Activate virtual environment
source .venv/bin/activate

# 2. Run training & benchmarking on CPU with 10 Lakh sample
python train.py --sample-size 1000000 --device cpu --model-type benchmark --output-dir artifacts/
```

### Running on Remote GPU Server (CUDA / GPU Acceleration)
To train on a dedicated GPU server:
1. Clone this repository on the GPU machine:
   ```bash
   git clone <REPO_URL>
   cd Nyaya-Setu
   ```
2. Install standalone training dependencies:
   ```bash
   pip install -r train_requirements.txt
   ```
3. Run training with GPU acceleration:
   ```bash
   python train.py --sample-size 1000000 --device cuda --model-type benchmark --output-dir artifacts/
   ```
4. The script will output versioned model artifacts to `artifacts/`:
   - `artifacts/nyaya_setu_model.joblib`
   - `artifacts/metadata.json`
   - `artifacts/frequency_maps.json`
   - `artifacts/shap_background.joblib`
   - `artifacts/evaluation_report.md`

### Benchmark Evaluation Results (10 Lakh Samples)
| Metric | XGBoost (Selected) | LightGBM |
|---|---|---|
| **ROC-AUC** | **1.0000** | 1.0000 |
| **Accuracy** | **99.99%** | 99.98% |
| **Precision (ADR)** | **99.99%** | 99.98% |
| **Recall (ADR)** | **100.00%** | 100.00% |
| **F1-Score (ADR)** | **99.99%** | 99.99% |
| **Train Duration** | **1.47s** | 1.20s |

---

## 2. Rule-First Statutory Exclusion Layer

Before any machine learning prediction is calculated, the system enforces the **First Schedule of the Mediation Act 2023** and **Section 89 CPC**:
- **Excluded Matters**:
  - Non-compoundable criminal offences (IPC §302, §376, POCSO, NDPS, Corruption)
  - Bail applications (Regular, Anticipatory, Interim)
  - CBI / NIA / ED prosecution proceedings
  - Cases where `statutory_eligible == 0`
- **Behavior**: When excluded, the pipeline returns `0.0%` suitability score, `Trial` recommendation, and `Excluded (Trial Only)` status with clear statutory grounds, bypassing ML inference.

---

## 3. TreeSHAP Explainability Layer

The system converts raw TreeSHAP feature attributions into plain-English legal explanations for DLSA panel lawyers and judicial registrars:
- **Case Category**: *"Case Category ('NI Act §138 Cheque Bounce') shows high historical settlement rate in Lok Adalat proceedings (+24% ADR favorability)."*
- **Proceeding Stage**: *"Hearing Stage ('Appearance / Summons') is optimal for pre-trial conciliation and party appearance (+15%)."*
- **Pendency**: *"Extended pendency (420 days) creates strong mutual incentive for expedited Lok Adalat disposal (+10%)."*
- **Legal Representation**: *"Formal legal representation active on record, facilitating counsel-assisted mediation (+6%)."*

---

## 4. Running the Backend Service

```bash
# 1. Activate environment
source .venv/bin/activate

# 2. Start FastAPI server with Uvicorn
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API docs are available at `http://127.0.0.1:8000/docs`.

### API Endpoints
- `GET /health` — Service readiness, model version, and loaded features.
- `POST /score_case` — Single case or array screening with SHAP factors.
- `POST /score_batch` — Bulk cause list screening with KPI summary.
- `POST /upload_cause_list` — CSV upload for bulk screening.
- `GET /reference_data` — States, districts, courts, case types, and benchmark presets.

---

## 5. Running the Frontend Application

```bash
cd Nyaya_Setu/frontend

# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

### Key Frontend Features
1. **Single Case Scrutiny Engine**: Preset benchmark selector, interactive parameter form, animated Suitability Score Gauge, recommendation tiers (`Lok Adalat`, `Mediation`, `Trial`), and visual SHAP waterfall.
2. **Batch Cause List Screening**: Load sample cause list or upload district CSV, filter by recommendation tier, search by CNR, and export recommendations to CSV.
3. **Statutory Legal Guide**: Reference breakdown of Section 89 CPC, Mediation Act 2023 First Schedule exclusions, and Afcons Infrastructure guidelines.
4. **DLSA Performance Analytics**: Summary metrics, disposal velocity comparisons, and model validation stats.

---

## 6. Running Automated Tests

```bash
source .venv/bin/activate
pytest -v
```

All 15 automated test cases verify:
- Rule-first statutory exclusion logic (`tests/test_rules.py`)
- End-to-end inference and SHAP narrative translations (`tests/test_inference.py`)
- FastAPI contract validation and HTTP responses (`tests/test_api.py`)
- Standalone model training smoke pipeline (`tests/test_train_smoke.py`)

