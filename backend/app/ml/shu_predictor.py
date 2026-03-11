"""
Production SHU Predictor
========================

Uses trained Linear Regression and Random Forest models to predict
Scoville Heat Units from morphological features + color + flower stress.
Replaces the mock predictions in heat_predictor.py.
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

# Authoritative SHU ranges per variety (used for clamping + fallback)
# Sources: pepper authority databases, aligned with heat_predictor.py
VARIETY_SHU_RANGES = {
    "Siling Haba": (500, 15000),
    "Siling Labuyo": (15000, 100000),
    "Siling Demonyo": (50000, 350000),
}

# Alias for backward compat
FALLBACK_SHU = VARIETY_SHU_RANGES

# Feature order must match training (SHU_FEATURES in train_models.py)
SHU_FEATURE_ORDER = [
    "variety_code",
    "pod_length_mm",
    "pod_width_mm",
    "pod_weight_g",
    "color_r",
    "color_g",
    "color_b",
    "hue",
    "saturation",
    "value_hsv",
    "maturity_score",
    "flower_stress_score",
]


class SHUPredictor:
    """
    Predicts Scoville Heat Units using trained scikit-learn models.
    Supports Linear Regression, Random Forest, and ensemble modes.
    Falls back to heuristic estimation if model files aren't found.
    """

    def __init__(self):
        self.lr_model = None
        self.lr_scaler = None
        self.lr_metadata = None
        self.rf_model = None
        self.rf_metadata = None
        self._load_models()

    def _load_models(self):
        """Load trained models from disk."""
        # Linear Regression
        try:
            lr_path = os.path.join(MODELS_DIR, "linear_regression_shu.joblib")
            scaler_path = os.path.join(MODELS_DIR, "linear_regression_scaler.joblib")
            lr_meta_path = os.path.join(MODELS_DIR, "linear_regression_metadata.json")
            if os.path.exists(lr_path) and os.path.exists(scaler_path):
                self.lr_model = joblib.load(lr_path)
                self.lr_scaler = joblib.load(scaler_path)
                if os.path.exists(lr_meta_path):
                    with open(lr_meta_path) as f:
                        self.lr_metadata = json.load(f)
                logger.info("Linear Regression SHU model loaded")
        except Exception as e:
            logger.error(f"Failed to load Linear Regression model: {e}")

        # Random Forest
        try:
            rf_path = os.path.join(MODELS_DIR, "random_forest_shu.joblib")
            rf_meta_path = os.path.join(MODELS_DIR, "random_forest_metadata.json")
            if os.path.exists(rf_path):
                self.rf_model = joblib.load(rf_path)
                if os.path.exists(rf_meta_path):
                    with open(rf_meta_path) as f:
                        self.rf_metadata = json.load(f)
                logger.info("Random Forest SHU model loaded")
        except Exception as e:
            logger.error(f"Failed to load Random Forest model: {e}")

    @property
    def is_ready(self) -> bool:
        return self.lr_model is not None or self.rf_model is not None

    def _build_features(self, **kwargs) -> pd.DataFrame:
        """Build feature DataFrame in the correct order for the model."""
        variety = kwargs.get("variety", "Siling Labuyo")
        # Accept length/width in cm from API, convert to mm for model
        length_cm = kwargs.get("length_cm", kwargs.get("pod_length_mm", 50.0) / 10)
        width_cm = kwargs.get("width_cm", kwargs.get("pod_width_mm", 10.0) / 10)
        data = {
            "variety_code": [VARIETY_CODE_MAP.get(variety, 1)],
            "pod_length_mm": [length_cm * 10],
            "pod_width_mm": [width_cm * 10],
            "pod_weight_g": [kwargs.get("weight_g", kwargs.get("pod_weight_g", 5.0))],
            "color_r": [kwargs.get("color_r", 180)],
            "color_g": [kwargs.get("color_g", 50)],
            "color_b": [kwargs.get("color_b", 30)],
            "hue": [kwargs.get("hue", 15.0)],
            "saturation": [kwargs.get("saturation", 200.0)],
            "value_hsv": [kwargs.get("value_hsv", 180.0)],
            "maturity_score": [kwargs.get("maturity_score", 0.5)],
            "flower_stress_score": [kwargs.get("flower_stress_score", 0.0)],
        }
        return pd.DataFrame(data, columns=SHU_FEATURE_ORDER)

    def predict(self, model: str = "random_forest", **kwargs) -> Dict[str, Any]:
        """
        Predict SHU for a chili pod.

        Args:
            model: "linear_regression", "random_forest", or "ensemble"
            **kwargs: variety, length_cm, width_cm, weight_g,
                      color_r/g/b, hue, saturation, value_hsv,
                      maturity_score, flower_stress_score

        Returns:
            Dict with predicted_shu, model_used, confidence, etc.
        """
        model_type = model
        variety = kwargs.get("variety", "Siling Labuyo")
        features = self._build_features(**kwargs)

        result = {
            "variety": variety,
            "model_used": model_type,
            "features_used": {k: v for k, v in kwargs.items()},
        }

        if model_type == "ensemble":
            return self._predict_ensemble(**kwargs)

        if model_type == "linear_regression" and self.lr_model is not None:
            features_scaled = self.lr_scaler.transform(features)
            predicted = float(self.lr_model.predict(features_scaled)[0])
            result["predicted_shu"] = max(0, round(predicted))
            result["model_r2"] = self.lr_metadata.get("test_r2", 0) if self.lr_metadata else 0
            result["model_mae"] = self.lr_metadata.get("test_mae", 0) if self.lr_metadata else 0
            if self.lr_metadata and "coefficients" in self.lr_metadata:
                result["feature_contributions"] = {}
                for i, fname in enumerate(SHU_FEATURE_ORDER):
                    coef = self.lr_metadata["coefficients"].get(fname, 0)
                    result["feature_contributions"][fname] = round(float(coef * features_scaled[0][i]), 2)

        elif model_type == "random_forest" and self.rf_model is not None:
            predicted = float(self.rf_model.predict(features)[0])
            result["predicted_shu"] = max(0, round(predicted))
            result["model_r2"] = self.rf_metadata.get("test_r2", 0) if self.rf_metadata else 0
            result["model_mae"] = self.rf_metadata.get("test_mae", 0) if self.rf_metadata else 0
            if self.rf_metadata:
                result["feature_importances"] = self.rf_metadata.get("feature_importances", {})
            # Prediction interval from individual trees (use .values to avoid feature-name warning)
            features_arr = features.values if hasattr(features, 'values') else features
            tree_preds = np.array([t.predict(features_arr)[0] for t in self.rf_model.estimators_])
            result["prediction_interval"] = {
                "p5": max(0, round(float(np.percentile(tree_preds, 5)))),
                "p95": round(float(np.percentile(tree_preds, 95))),
                "std": round(float(np.std(tree_preds)), 1),
            }
        else:
            result = self._fallback_prediction(**kwargs)

        # Clamp SHU to the realistic range for this variety
        shu = result.get("predicted_shu", 0)
        variety = result.get("variety", kwargs.get("variety", "Siling Labuyo"))
        shu_min, shu_max = VARIETY_SHU_RANGES.get(variety, (0, 500000))
        clamped_shu = max(shu_min, min(shu_max, shu))
        result["predicted_shu"] = clamped_shu
        if clamped_shu != shu:
            result["original_unclamped_shu"] = shu

        # Enrich with heat category and capsaicin
        result["heat_category"] = self._heat_category(clamped_shu)
        result["estimated_capsaicin_pct"] = round(clamped_shu / 16_000_000 * 100, 4)
        result["estimated_capsaicin_mg_per_g"] = round(clamped_shu / 16_000, 3)

        return result

    def predict_both(self, **kwargs) -> Dict[str, Any]:
        """Run prediction with both models for comparison."""
        lr = self.predict(model="linear_regression", **kwargs)
        rf = self.predict(model="random_forest", **kwargs)
        best = rf if rf.get("model_r2", 0) >= lr.get("model_r2", 0) else lr
        return {
            "linear_regression": lr,
            "random_forest": rf,
            "recommended": best,
            "shu_difference": abs(lr.get("predicted_shu", 0) - rf.get("predicted_shu", 0)),
        }

    def _predict_ensemble(self, **kwargs) -> Dict[str, Any]:
        """Weighted ensemble of LR and RF."""
        lr_result = self.predict(model="linear_regression", **kwargs)
        rf_result = self.predict(model="random_forest", **kwargs)

        lr_shu = lr_result.get("predicted_shu", 0)
        rf_shu = rf_result.get("predicted_shu", 0)
        ensemble_shu = round(0.3 * lr_shu + 0.7 * rf_shu)

        # Clamp ensemble to variety range
        variety = kwargs.get("variety", "Siling Labuyo")
        shu_min, shu_max = VARIETY_SHU_RANGES.get(variety, (0, 500000))
        ensemble_shu = max(shu_min, min(shu_max, ensemble_shu))

        agreement = 1 - abs(lr_shu - rf_shu) / max(lr_shu, rf_shu, 1)

        return {
            "variety": variety,
            "predicted_shu": ensemble_shu,
            "model_used": "ensemble",
            "confidence": round(min(1.0, max(0.5, agreement)), 4),
            "heat_category": self._heat_category(ensemble_shu),
            "linear_regression_shu": lr_shu,
            "random_forest_shu": rf_shu,
            "model_predictions": {
                "linear_regression": lr_shu,
                "random_forest": rf_shu,
            },
            "prediction_interval": rf_result.get("prediction_interval", {}),
            "model_r2": self.rf_metadata.get("test_r2", 0) if self.rf_metadata else 0,
            "model_mae": self.rf_metadata.get("test_mae", 0) if self.rf_metadata else 0,
            "estimated_capsaicin_pct": round(ensemble_shu / 16_000_000 * 100, 4),
            "estimated_capsaicin_mg_per_g": round(ensemble_shu / 16_000, 3),
        }

    def _fallback_prediction(self, **kwargs) -> Dict[str, Any]:
        """Heuristic SHU estimation when models aren't loaded."""
        variety = kwargs.get("variety", "Siling Labuyo")
        shu_min, shu_max = FALLBACK_SHU.get(variety, (50000, 100000))
        maturity = kwargs.get("maturity_score", 0.5)
        stress = kwargs.get("flower_stress_score", 0.0)

        # Smaller pod → higher heat within variety
        pod_len = kwargs.get("pod_length_mm", 0)
        from .dataset_generator import VARIETY_PROFILES
        profile = VARIETY_PROFILES.get(variety, {})
        size_factor = 1.0
        if pod_len > 0 and profile:
            mean_len = profile["pod_length_mm"]["mean"]
            size_factor = max(0.3, min(1.7, 1.3 - 0.3 * (pod_len / mean_len)))

        base = (shu_min + shu_max) / 2
        predicted = base * size_factor * (0.5 + maturity * 0.3 + stress * 0.2)
        predicted = max(shu_min, min(shu_max, predicted))

        return {
            "variety": variety,
            "predicted_shu": round(predicted),
            "model_used": "fallback_heuristic",
            "model_r2": 0,
            "model_mae": 0,
            "warning": "Trained model not available; using heuristic estimation",
        }

    @staticmethod
    def _heat_category(shu: int) -> str:
        if shu < 5000:
            return "Mild"
        elif shu < 15000:
            return "Medium"
        elif shu < 50000:
            return "Hot"
        elif shu < 100000:
            return "Very Hot"
        elif shu < 200000:
            return "Extra Hot"
        else:
            return "Extremely Hot"


# Singleton instance
_shu_predictor = None


def get_shu_predictor(force_reload: bool = False) -> SHUPredictor:
    global _shu_predictor
    if _shu_predictor is None or force_reload:
        _shu_predictor = SHUPredictor()
    return _shu_predictor
