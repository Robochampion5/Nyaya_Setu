"""
Nyaya Setu - Backend Configuration
==================================
Settings and environment configuration for the Nyaya Setu ADR Suitability Screening API.
"""

from pathlib import Path
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="NYAYA_",
        env_file=".env",
        extra="ignore",
    )

    PROJECT_NAME: str = "Nyaya Setu"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "AI-powered ADR Suitability Screening System for Indian District Courts (Section 89 CPC & Mediation Act 2023)"
    API_V1_PREFIX: str = "/api"
    
    # Base directories
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent.parent
    ARTIFACTS_DIR: Path = BASE_DIR / "artifacts"
    
    # Model artifact paths
    MODEL_PATH: Path = ARTIFACTS_DIR / "nyaya_setu_model.joblib"
    METADATA_PATH: Path = ARTIFACTS_DIR / "metadata.json"
    FREQUENCY_MAPS_PATH: Path = ARTIFACTS_DIR / "frequency_maps.json"
    SHAP_BACKGROUND_PATH: Path = ARTIFACTS_DIR / "shap_background.joblib"
    
    # Reference data paths
    STATE_KEY_CSV: Path = BASE_DIR / "cases_state_key.csv"
    DISTRICT_KEY_CSV: Path = BASE_DIR / "cases_district_key.csv"
    COURT_KEY_CSV: Path = BASE_DIR / "cases_court_key.csv"
    
    # Decision thresholds
    LOK_ADALAT_THRESHOLD: float = 0.65  # Score >= 65% -> Lok Adalat
    MEDIATION_THRESHOLD: float = 0.40   # 40% <= Score < 65% -> Mediation
    # Score < 40% -> Trial
    
    # CORS Origins
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*",
    ]
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: Union[bool, str] = False


settings = Settings()

