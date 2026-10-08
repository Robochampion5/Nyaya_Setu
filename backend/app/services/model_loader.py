"""
Nyaya Setu - Model & Artifact Loader Service
============================================
Singleton service to manage preloaded model, metadata, frequency lookups,
and TreeSHAP explainer in memory at application startup.
"""

import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib
import pandas as pd

from backend.app.core.config import settings
from backend.app.services.explainer import ShapExplainerService
from backend.app.services.category_matcher import category_matcher as _category_matcher

logger = logging.getLogger("NyayaSetuModelLoader")


class ModelManager:
    """Singleton model cache and runtime inference resource manager."""

    _instance: Optional["ModelManager"] = None

    def __init__(self):
        self.model: Optional[Any] = None
        self.metadata: Dict[str, Any] = {}
        self.frequency_maps: Dict[str, Any] = {}
        self.explainer_service: Optional[ShapExplainerService] = None
        self.features: List[str] = []
        self.is_loaded: bool = False
        self.load_error: Optional[str] = None
        self.start_time: float = time.time()
        self.category_matcher = _category_matcher

    @classmethod
    def get_instance(cls) -> "ModelManager":
        if cls._instance is None:
            cls._instance = ModelManager()
        return cls._instance

    def load_artifacts(self) -> bool:
        """Load model, metadata, and lookup tables into memory."""
        logger.info("Initializing Nyaya Setu ModelManager...")
        try:
            # 1. Load Metadata
            if settings.METADATA_PATH.exists():
                with open(settings.METADATA_PATH, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                self.features = self.metadata.get("features", [])
                logger.info("Loaded metadata: version=%s, features=%d", self.metadata.get("version"), len(self.features))
            else:
                logger.warning("Metadata file not found at %s", settings.METADATA_PATH)

            # 2. Load Frequency Maps
            if settings.FREQUENCY_MAPS_PATH.exists():
                with open(settings.FREQUENCY_MAPS_PATH, "r", encoding="utf-8") as f:
                    self.frequency_maps = json.load(f)
                logger.info("Loaded frequency lookup tables.")
            else:
                logger.warning("Frequency maps file not found at %s", settings.FREQUENCY_MAPS_PATH)

            # 3. Load Trained Model
            if settings.MODEL_PATH.exists():
                self.model = joblib.load(settings.MODEL_PATH)
                logger.info("Loaded model artifact from %s", settings.MODEL_PATH)
            else:
                logger.warning("Model artifact not found at %s. Running in stub mode until model is trained.", settings.MODEL_PATH)

            # 4. Load SHAP Background & Initialize Explainer
            background_sample = None
            if settings.SHAP_BACKGROUND_PATH.exists():
                try:
                    background_sample = joblib.load(settings.SHAP_BACKGROUND_PATH)
                    logger.info("Loaded SHAP background sample (%d rows)", len(background_sample))
                except Exception as e:
                    logger.warning("Could not load SHAP background: %s", e)

            if self.model is not None:
                self.explainer_service = ShapExplainerService(self.model, background_sample)

            # 5. Initialize Semantic Category Matcher (Option D2)
            if self.frequency_maps:
                logger.info("CategoryMatcher: Initializing semantic embedding index…")
                matcher_ok = self.category_matcher.initialize(self.frequency_maps)
                if matcher_ok:
                    logger.info("CategoryMatcher: Ready with %d vocabulary entries.", len(self.frequency_maps.get("type_name_val_freq_map", {})))
                else:
                    logger.warning("CategoryMatcher: Initialization failed; will fall back to substring matching.")

            self.is_loaded = self.model is not None
            return self.is_loaded

        except Exception as e:
            logger.error("Error loading model artifacts: %s", e, exc_info=True)
            self.load_error = str(e)
            self.is_loaded = False
            return False

    def get_type_freq(self, type_name_val: Optional[str]) -> float:
        """Lookup category frequency for a case type string."""
        if not type_name_val:
            return self.frequency_maps.get("default_type_freq", 0.05)
        
        type_map = self.frequency_maps.get("type_name_val_freq_map", {})
        cleaned_key = str(type_name_val).lower().strip()
        
        # Direct lookup
        if cleaned_key in type_map:
            return type_map[cleaned_key]
            
        # Substring / partial match
        for k, v in type_map.items():
            if k in cleaned_key or cleaned_key in k:
                return v
                
        return self.frequency_maps.get("default_type_freq", 0.05)

    def get_purpose_freq(self, purpose_name_val: Optional[str]) -> float:
        """Lookup stage frequency for a purpose string."""
        if not purpose_name_val:
            return self.frequency_maps.get("default_purpose_freq", 0.05)
            
        purpose_map = self.frequency_maps.get("purpose_name_val_freq_map", {})
        cleaned_key = str(purpose_name_val).lower().strip()
        
        if cleaned_key in purpose_map:
            return purpose_map[cleaned_key]
            
        for k, v in purpose_map.items():
            if k in cleaned_key or cleaned_key in k:
                return v
                
        return self.frequency_maps.get("default_purpose_freq", 0.05)

    def get_judge_freq(self) -> float:
        """Get standard judge position frequency."""
        return self.frequency_maps.get("default_judge_position_freq", 0.2418)


model_manager = ModelManager.get_instance()

