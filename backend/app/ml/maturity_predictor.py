"""
Maturity Predictor
==================

Decision Tree model for chili maturity assessment.
"""

import numpy as np
from typing import Dict, Optional
import logging
import joblib
import os

logger = logging.getLogger(__name__)

# Maturity stages
MATURITY_STAGES = {
    "Immature": (0, 25),
    "Developing": (25, 60),
    "Mature": (60, 85),
    "Overripe": (85, 100)
}


def get_maturity_stage(score: float) -> str:
    """Get maturity stage from score."""
    for stage, (min_score, max_score) in MATURITY_STAGES.items():
        if min_score <= score < max_score:
            return stage
    return "Overripe"


class MaturityPredictor:
    """
    Decision Tree Regressor for maturity prediction.
    
    Provides interpretable maturity scoring with harvest recommendations.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.feature_names = [
            "color_intensity",
            "color_saturation",
            "color_hue",
            "days_since_flowering",
            "size_ratio",
            "texture_score"
        ]
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def build_model(self, max_depth: int = 8):
        """Build the Decision Tree model."""
        try:
            from sklearn.tree import DecisionTreeRegressor
            
            self.model = DecisionTreeRegressor(
                max_depth=max_depth,
                min_samples_split=10,
                min_samples_leaf=5,
                random_state=42
            )
            logger.info("Decision Tree model initialized")
            
        except ImportError:
            logger.warning("scikit-learn not available")
    
    def prepare_features(self, data: Dict) -> np.ndarray:
        """
        Prepare feature vector from input data.
        
        Args:
            data: Dictionary with color and morphological data
            
        Returns:
            Feature vector
        """
        color = data.get("color", {})
        
        # Calculate color intensity (brightness)
        r = color.get("r", 128)
        g = color.get("g", 128)
        b = color.get("b", 128)
        intensity = (r + g + b) / 3 / 255  # Normalize to 0-1
        
        # Get HSV values
        hsv = data.get("hsv", {})
        saturation = hsv.get("s", 50) / 100  # Normalize
        hue = hsv.get("h", 30) / 360  # Normalize
        
        # Days since flowering
        days = data.get("days_since_flowering", 30)
        days_normalized = min(1.0, days / 90)  # Max 90 days
        
        # Size ratio (current size / expected mature size)
        current_size = data.get("current_size_mm", 30)
        expected_size = data.get("expected_size_mm", 50)
        size_ratio = min(1.5, current_size / max(expected_size, 1))
        
        # Texture score (from texture features)
        texture = data.get("texture_score", 0.5)
        
        features = [
            intensity,
            saturation,
            hue,
            days_normalized,
            size_ratio,
            texture
        ]
        
        return np.array(features).reshape(1, -1)
    
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """
        Train the model.
        
        Args:
            X: Feature matrix
            y: Target values (maturity scores 0-100)
            
        Returns:
            Training results
        """
        if self.model is None:
            self.build_model()
        
        self.model.fit(X, y)
        
        # Get tree rules
        tree_rules = self._get_tree_rules()
        
        return {
            "depth": self.model.get_depth(),
            "n_leaves": self.model.get_n_leaves(),
            "feature_importance": dict(zip(
                self.feature_names,
                self.model.feature_importances_
            )),
            "rules_preview": tree_rules[:500]  # First 500 chars
        }
    
    def _get_tree_rules(self) -> str:
        """Export tree rules as text."""
        if self.model is None:
            return ""
        
        try:
            from sklearn.tree import export_text
            return export_text(
                self.model,
                feature_names=self.feature_names
            )
        except Exception:
            return ""
    
    def predict(self, data: Dict) -> Dict:
        """
        Predict maturity from features.
        
        Args:
            data: Dictionary with color, morphological data
            
        Returns:
            Maturity prediction results
        """
        if self.model is None:
            return self._mock_prediction(data)
        
        X = self.prepare_features(data)
        score = float(self.model.predict(X)[0])
        score = max(0, min(100, score))
        
        stage = get_maturity_stage(score)
        days_to_harvest = self._estimate_harvest_days(score, stage)
        
        return {
            "score": round(score, 1),
            "stage": stage,
            "days_to_harvest": days_to_harvest,
            "confidence": self._calculate_confidence(data),
            "harvest_recommendation": self._get_harvest_recommendation(stage)
        }
    
    def _mock_prediction(self, data: Dict) -> Dict:
        """Generate mock prediction."""
        # Use days since flowering as main indicator
        days = data.get("days_since_flowering", 30)
        
        # Typical maturity timeline
        if days < 20:
            score = 15 + np.random.uniform(-5, 5)
        elif days < 40:
            score = 40 + np.random.uniform(-10, 10)
        elif days < 60:
            score = 70 + np.random.uniform(-10, 10)
        else:
            score = 90 + np.random.uniform(-5, 5)
        
        score = max(0, min(100, score))
        stage = get_maturity_stage(score)
        
        return {
            "score": round(score, 1),
            "stage": stage,
            "days_to_harvest": self._estimate_harvest_days(score, stage),
            "confidence": np.random.uniform(0.7, 0.9),
            "harvest_recommendation": self._get_harvest_recommendation(stage)
        }
    
    def _estimate_harvest_days(self, score: float, stage: str) -> Optional[int]:
        """Estimate days until optimal harvest."""
        if stage == "Mature":
            return int(np.random.randint(0, 5))
        elif stage == "Developing":
            remaining = 75 - score  # Target score 75
            return int(remaining / 2)  # Rough estimate: 2 points per day
        elif stage == "Immature":
            remaining = 75 - score
            return int(remaining / 1.5)
        else:  # Overripe
            return 0  # Harvest immediately
    
    def _calculate_confidence(self, data: Dict) -> float:
        """Calculate confidence based on data quality."""
        confidence = 0.5
        
        if data.get("days_since_flowering"):
            confidence += 0.2
        if data.get("color"):
            confidence += 0.15
        if data.get("hsv"):
            confidence += 0.1
        if data.get("texture_score"):
            confidence += 0.05
        
        return min(1.0, confidence)
    
    def _get_harvest_recommendation(self, stage: str) -> str:
        """Get harvest recommendation based on stage."""
        recommendations = {
            "Immature": "Not ready for harvest. Continue monitoring growth and color development.",
            "Developing": "Approaching maturity. Check daily for color changes and firmness.",
            "Mature": "Optimal harvest window. Harvest within 3-5 days for best quality.",
            "Overripe": "Past optimal harvest. Harvest immediately or use for seed collection."
        }
        return recommendations.get(stage, "Monitor regularly.")
    
    def save_model(self, path: str):
        """Save model to file."""
        if self.model:
            joblib.dump(self.model, path)
            logger.info(f"Model saved to {path}")
    
    def load_model(self, path: str):
        """Load model from file."""
        try:
            self.model = joblib.load(path)
            logger.info(f"Model loaded from {path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")


class MaturityAnalyzer:
    """
    Complete maturity analysis combining Decision Tree with color analysis.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.predictor = MaturityPredictor(model_path)
        
        # Color indicators for different stages
        self.color_indicators = {
            "green": {"stage": "Immature", "score_range": (0, 30)},
            "yellow-green": {"stage": "Developing", "score_range": (30, 50)},
            "yellow": {"stage": "Developing", "score_range": (50, 65)},
            "orange": {"stage": "Mature", "score_range": (65, 80)},
            "red": {"stage": "Mature", "score_range": (75, 90)},
            "dark-red": {"stage": "Overripe", "score_range": (85, 100)}
        }
    
    def analyze_color_stage(self, color: Dict) -> str:
        """
        Determine maturity stage from color.
        
        Uses hue-based classification for chili peppers.
        """
        h = color.get("h", 30)  # Hue value (0-360)
        s = color.get("s", 50)  # Saturation
        v = color.get("v", 50)  # Value/brightness
        
        # Green range
        if 70 <= h <= 150:
            return "green" if s > 40 else "yellow-green"
        # Yellow range
        elif 35 <= h < 70:
            return "yellow"
        # Orange range  
        elif 15 <= h < 35:
            return "orange"
        # Red range
        elif h < 15 or h > 340:
            if v > 50:
                return "red"
            else:
                return "dark-red"
        
        return "unknown"
    
    def full_analysis(self, data: Dict) -> Dict:
        """
        Perform full maturity analysis.
        
        Args:
            data: Dictionary with all available data
            
        Returns:
            Complete maturity analysis
        """
        # Get model prediction
        prediction = self.predictor.predict(data)
        
        # Analyze color
        hsv = data.get("hsv", {})
        color_stage = self.analyze_color_stage(hsv)
        color_info = self.color_indicators.get(
            color_stage,
            {"stage": "Unknown", "score_range": (0, 100)}
        )
        
        # Cross-validate with color analysis
        color_score_range = color_info["score_range"]
        model_score = prediction["score"]
        
        # Adjust if there's significant disagreement
        if model_score < color_score_range[0] - 10:
            adjusted_score = (model_score + color_score_range[0]) / 2
        elif model_score > color_score_range[1] + 10:
            adjusted_score = (model_score + color_score_range[1]) / 2
        else:
            adjusted_score = model_score
        
        adjusted_stage = get_maturity_stage(adjusted_score)
        
        return {
            "model_prediction": prediction,
            "color_analysis": {
                "detected_color": color_stage,
                "expected_stage": color_info["stage"],
                "expected_score_range": color_score_range
            },
            "final_assessment": {
                "score": round(adjusted_score, 1),
                "stage": adjusted_stage,
                "days_to_harvest": prediction["days_to_harvest"],
                "confidence": prediction["confidence"],
                "recommendation": self.predictor._get_harvest_recommendation(adjusted_stage)
            }
        }
