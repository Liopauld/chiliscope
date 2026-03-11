"""
Production Maturity Predictor (Decision Tree)
==============================================

Uses the trained Decision Tree Regressor to predict maturity score (0-1)
from color (RGB/HSV) + developmental time features.
"""

import os
import json
import logging
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Any

logger = logging.getLogger(__name__)

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")

VARIETY_CODE_MAP = {
    "Siling Haba": 0,
    "Siling Labuyo": 1,
    "Siling Demonyo": 2,
}


class TrainedMaturityPredictor:
    """Predicts maturity score (0-1) using trained Decision Tree Regressor."""

    def __init__(self):
        self.model = None
        self.metadata = None
        self._load_model()

    def _load_model(self):
        try:
            model_path = os.path.join(MODELS_DIR, "decision_tree_maturity.joblib")
            meta_path = os.path.join(MODELS_DIR, "decision_tree_metadata.json")
            if os.path.exists(model_path):
                self.model = joblib.load(model_path)
                if os.path.exists(meta_path):
                    with open(meta_path) as f:
                        self.metadata = json.load(f)
                logger.info("Decision Tree maturity model loaded")
        except Exception as e:
            logger.error(f"Failed to load maturity model: {e}")

    @property
    def is_ready(self) -> bool:
        return self.model is not None

    def predict(
        self,
        variety: str = "Siling Labuyo",
        color_r: int = 180,
        color_g: int = 50,
        color_b: int = 30,
        hue: float = 15.0,
        saturation: float = 200.0,
        value_hsv: float = 180.0,
        days_to_maturity: float = 65.0,
    ) -> Dict[str, Any]:
        """
        Predict maturity score for a chili pod.

        Returns dict with maturity_score (0-1), stage, harvest_ready,
        recommendation, and model metadata.
        """
        variety_code = VARIETY_CODE_MAP.get(variety, 1)
        features = pd.DataFrame({
            "variety_code": [variety_code],
            "color_r": [color_r],
            "color_g": [color_g],
            "color_b": [color_b],
            "hue": [hue],
            "saturation": [saturation],
            "value_hsv": [value_hsv],
            "days_to_maturity": [days_to_maturity],
        })

        result = {
            "variety": variety,
            "features_used": {
                "variety_code": variety_code,
                "color_r": color_r,
                "color_g": color_g,
                "color_b": color_b,
                "hue": hue,
                "saturation": saturation,
                "value_hsv": value_hsv,
                "days_to_maturity": days_to_maturity,
            },
        }

        if self.model is not None:
            score = float(self.model.predict(features)[0])
            score = max(0.0, min(1.0, score))
            result["maturity_score"] = round(score, 4)
            result["model_used"] = "decision_tree"
            result["model_r2"] = self.metadata.get("test_r2", 0) if self.metadata else 0
            result["model_mae"] = self.metadata.get("test_mae", 0) if self.metadata else 0
            if self.metadata:
                result["feature_importances"] = self.metadata.get("feature_importances", {})
        else:
            # Heuristic fallback
            hue_score = max(0, 1.0 - hue / 120.0)
            day_score = max(0, min(1.0, (days_to_maturity - 40) / 50))
            score = 0.6 * hue_score + 0.4 * day_score
            result["maturity_score"] = round(score, 4)
            result["model_used"] = "fallback_heuristic"
            result["model_r2"] = 0
            result["warning"] = "Decision Tree model not available; using heuristic"

        # Determine stage & recommendation
        score = result["maturity_score"]
        if score < 0.25:
            result["stage"] = "Immature (Green)"
            result["harvest_ready"] = False
            result["recommendation"] = "Not ready for harvest. Wait for color change."
        elif score < 0.50:
            result["stage"] = "Developing"
            result["harvest_ready"] = False
            result["recommendation"] = "Pod is developing. Harvest in 1-2 weeks for green chili use."
        elif score < 0.85:
            result["stage"] = "Mature (Ready)"
            result["harvest_ready"] = True
            result["recommendation"] = "Optimal harvest window. Pod has reached full maturity."
        else:
            result["stage"] = "Overripe"
            result["harvest_ready"] = True
            result["recommendation"] = "Pod is overripe. Harvest immediately or use for seed collection."

        result["maturity_percentage"] = round(score * 100, 1)
        return result


# Singleton
_maturity_predictor = None


def get_trained_maturity_predictor(force_reload: bool = False) -> TrainedMaturityPredictor:
    global _maturity_predictor
    if _maturity_predictor is None or force_reload:
        _maturity_predictor = TrainedMaturityPredictor()
    return _maturity_predictor
