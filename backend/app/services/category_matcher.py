"""
Nyaya Setu - Semantic Category Matcher (Option D2)
===================================================
Uses a locally-cached MiniLM sentence-transformer model to map arbitrary
free-text case type strings to the nearest known vocabulary entry from
the training frequency map.

This allows district court officers to type in any case description
(even unlisted, abbreviated, or misspelled) and the system will:
  1. Embed the input using all-MiniLM-L6-v2 (80 MB, CPU-only fine for this)
  2. Compute cosine similarity against pre-embedded vocabulary (1,401 entries)
  3. Return the closest match + similarity score

Below CONFIDENCE_THRESHOLD (0.45), the fallback default frequency is used
and the response marks the match as uncertain.
"""

import json
import logging
import numpy as np
from pathlib import Path
from typing import Optional, Tuple, List, Dict

logger = logging.getLogger("NyayaSetuCategoryMatcher")

# Confidence below which we fall back to the default frequency
CONFIDENCE_THRESHOLD = 0.45
# If similarity > this, the match is "exact-enough" for green badge
HIGH_CONFIDENCE_THRESHOLD = 0.80

# Path to cache the precomputed vocabulary embeddings (avoids re-encoding on restart)
_CACHE_PATH = Path("artifacts/category_embeddings_cache.npz")

# Practical domain expansions for Indian legal terminology to boost semantic retrieval
LEGAL_EXPANSIONS = {
    "cheque bounce": "138 ni act cheque bounce dishonour",
    "bouncing cheque": "138 ni act cheque bounce dishonour",
    "bouncing check": "138 ni act check bounce dishonour",
    "check bounce": "138 ni act check bounce dishonour",
    "cheque": "138 ni act cheque",
    "mact": "motor accident claims mact mcop",
    "motor accident": "motor accident claim compensation mcop mact",
    "car crash": "motor accident claim compensation mcop mact",
    "road accident": "motor accident claim compensation mcop mact",
    "tenant eviction": "rent control act eviction suit landlord tenant",
    "landlord eviction": "rent control act eviction suit landlord tenant",
    "rent dispute": "rent control act appeal suit rent",
    "alimony": "matrimonial maintenance alimony family court",
    "divorce": "matrimonial divorce petition family court",
    "child custody": "guardians and wards act custody",
}


class CategoryMatcher:
    """
    Semantic similarity mapper from free-text case type to trained vocabulary.
    Lazy-loads the sentence-transformer on first use.
    """

    def __init__(self):
        self._model = None
        self._vocab_keys: List[str] = []
        self._vocab_embeddings: Optional[np.ndarray] = None
        self._frequency_map: Dict[str, float] = {}
        self._default_freq: float = 0.05
        self._ready: bool = False

    def initialize(self, frequency_maps: dict) -> bool:
        """
        Must be called after frequency_maps are loaded.
        Embeds the full vocabulary and caches to disk.
        """
        try:
            import torch
            torch.set_num_threads(1)
            from sentence_transformers import SentenceTransformer

            type_map: Dict[str, float] = frequency_maps.get("type_name_val_freq_map", {})
            self._frequency_map = type_map
            self._default_freq = frequency_maps.get("default_type_freq", 0.05)

            if not type_map:
                logger.warning("CategoryMatcher: frequency_map is empty, cannot embed vocabulary.")
                return False

            self._vocab_keys = list(type_map.keys())
            logger.info("CategoryMatcher: Loading all-MiniLM-L6-v2 model (CPU)...")
            self._model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")

            # Load cached embeddings if they exist and vocab size matches
            if _CACHE_PATH.exists():
                cached = np.load(_CACHE_PATH, allow_pickle=False)
                if cached["embeddings"].shape[0] == len(self._vocab_keys):
                    self._vocab_embeddings = cached["embeddings"].astype(np.float32)
                    logger.info(
                        "CategoryMatcher: Loaded %d vocabulary embeddings from cache.",
                        len(self._vocab_keys),
                    )
                    self._ready = True
                    return True
                else:
                    logger.info("CategoryMatcher: Cache size mismatch – re-encoding vocabulary.")

            # Encode the full vocabulary
            logger.info("CategoryMatcher: Encoding %d case type categories…", len(self._vocab_keys))
            embeddings = self._model.encode(
                self._vocab_keys,
                batch_size=256,
                show_progress_bar=False,
                normalize_embeddings=True,  # L2-normalise → cosine sim via dot product
                convert_to_numpy=True,
            )
            self._vocab_embeddings = embeddings.astype(np.float32)

            # Persist to disk cache
            _CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(_CACHE_PATH, embeddings=self._vocab_embeddings)
            logger.info("CategoryMatcher: Vocabulary embeddings cached to %s", _CACHE_PATH)

            self._ready = True
            return True

        except ImportError:
            logger.error(
                "CategoryMatcher: sentence-transformers not installed. "
                "Run: pip install sentence-transformers"
            )
            return False
        except Exception as e:
            logger.error("CategoryMatcher: Initialization failed: %s", e, exc_info=True)
            return False

    def match(
        self, query: str
    ) -> Tuple[str, float, float, bool]:
        """
        Map a free-text case type to the nearest known vocabulary entry.

        Returns:
            matched_category (str): The closest vocabulary key.
            matched_frequency (float): The frequency value for scoring.
            similarity (float): Cosine similarity score (0.0 – 1.0).
            is_known (bool): True if query was in the vocabulary directly.
        """
        if not query:
            return "", self._default_freq, 0.0, False

        cleaned = query.lower().strip()

        # 1. Exact direct lookup first (O(1))
        if cleaned in self._frequency_map:
            freq = self._frequency_map[cleaned]
            return cleaned, freq, 1.0, True

        # 2. Normalized direct lookup (stripping punctuation / spacing)
        norm_cleaned = cleaned.replace(".", "").replace("-", " ").strip()
        for k, v in self._frequency_map.items():
            if k.replace(".", "").replace("-", " ").strip() == norm_cleaned:
                return k, v, 1.0, True

        # 3. Semantic embedding similarity
        if not self._ready or self._model is None or self._vocab_embeddings is None:
            logger.warning("CategoryMatcher: Not ready, returning default frequency.")
            return query, self._default_freq, 0.0, False

        try:
            # Check domain expansions
            encode_text = cleaned
            for phrase, expansion in LEGAL_EXPANSIONS.items():
                if phrase in cleaned:
                    encode_text = f"{cleaned} {expansion}"
                    break

            import torch
            with torch.no_grad():
                query_emb = self._model.encode(
                    [encode_text],
                    device="cpu",
                    show_progress_bar=False,
                    normalize_embeddings=True,
                    convert_to_numpy=True,
                ).astype(np.float32)

            # Cosine similarity = dot product (both are L2-normalised)
            similarities = (self._vocab_embeddings @ query_emb.T).flatten()
            best_idx = int(np.argmax(similarities))
            best_score = float(similarities[best_idx])
            best_key = self._vocab_keys[best_idx]

            if best_score >= CONFIDENCE_THRESHOLD:
                freq = self._frequency_map[best_key]
                logger.info(
                    "CategoryMatcher: '%s' → '%s' (similarity=%.3f)",
                    cleaned, best_key, best_score,
                )
                return best_key, freq, best_score, False
            else:
                logger.info(
                    "CategoryMatcher: '%s' below confidence threshold (best=%.3f '%s'), using default.",
                    cleaned, best_score, best_key,
                )
                return best_key, self._default_freq, best_score, False

        except Exception as e:
            logger.error("CategoryMatcher: Embedding inference failed: %s", e)
            return query, self._default_freq, 0.0, False

    @property
    def is_ready(self) -> bool:
        return self._ready


# Module-level singleton
category_matcher = CategoryMatcher()
