"""
Heat Predictor
==============

Regression models for SHU (Scoville Heat Units) prediction.
"""

import numpy as np
from typing import Dict, List, Optional, Any
import logging
import joblib
import os

logger = logging.getLogger(__name__)

# Heat level categories
HEAT_CATEGORIES = {
    "Mild": (0, 5000),
    "Medium": (5001, 15000),
    "Hot": (15001, 50000),
    "Extra Hot": (50001, 500000)
}

# Variety baseline SHU ranges
VARIETY_SHU_RANGES = {
    "Siling Haba": (500, 15000),
    "Siling Labuyo": (15000, 100000),
    "Siling Demonyo": (50000, 150000)
}


def get_heat_category(shu: int) -> str:
    """Get heat category from SHU value."""
    for category, (min_shu, max_shu) in HEAT_CATEGORIES.items():
        if min_shu <= shu <= max_shu:
            return category
    return "Extra Hot"


class LinearHeatPredictor:
    """
    Linear Regression model for SHU prediction.
    
    Uses morphological features to identify statistical correlations
    with heat levels.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.scaler = None
        self.feature_names = [
            "pod_length_mm",
            "pod_width_mm",
            "pod_weight_g",
            "flower_diameter_mm",
            "petal_count",
            "color_r",
            "color_g",
            "color_b",
            "saturation",
            "variety_siling_haba",
            "variety_siling_labuyo",
            "variety_siling_demonyo"
        ]
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def build_model(self):
        """Build the Linear Regression model."""
        try:
            from sklearn.linear_model import LinearRegression
            from sklearn.preprocessing import StandardScaler
            
            self.model = LinearRegression()
            self.scaler = StandardScaler()
            logger.info("Linear Regression model initialized")
            
        except ImportError:
            logger.warning("scikit-learn not available")
    
    def prepare_features(self, data: Dict) -> np.ndarray:
        """
        Prepare feature vector from input data.
        
        Args:
            data: Dictionary with morphological features
            
        Returns:
            Feature vector as numpy array
        """
        variety = data.get("variety", "Siling Labuyo")
        
        features = [
            data.get("pod_length_mm", 50),
            data.get("pod_width_mm", 10),
            data.get("pod_weight_g", 5),
            data.get("flower_diameter_mm", 12),
            data.get("petal_count", 5),
            data.get("color_r", 200),
            data.get("color_g", 50),
            data.get("color_b", 50),
            data.get("saturation", 150),
            1 if variety == "Siling Haba" else 0,
            1 if variety == "Siling Labuyo" else 0,
            1 if variety == "Siling Demonyo" else 0
        ]
        
        return np.array(features).reshape(1, -1)
    
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """
        Train the model on provided data.
        
        Args:
            X: Feature matrix
            y: Target values (SHU)
            
        Returns:
            Training results with coefficients
        """
        if self.model is None:
            self.build_model()
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Train
        self.model.fit(X_scaled, y)
        
        # Get feature importance
        coefficients = dict(zip(self.feature_names, self.model.coef_))
        
        return {
            "coefficients": coefficients,
            "intercept": float(self.model.intercept_),
            "r2_score": float(self.model.score(X_scaled, y))
        }
    
    def predict(self, data: Dict) -> Dict:
        """
        Predict SHU from morphological features.
        
        Args:
            data: Dictionary with features
            
        Returns:
            Prediction results
        """
        if self.model is None or self.scaler is None:
            return self._mock_prediction(data)
        
        X = self.prepare_features(data)
        X_scaled = self.scaler.transform(X)
        
        predicted_shu = max(0, int(self.model.predict(X_scaled)[0]))
        
        return {
            "predicted_shu": predicted_shu,
            "heat_category": get_heat_category(predicted_shu),
            "model": "Linear Regression"
        }
    
    def _mock_prediction(self, data: Dict) -> Dict:
        """Generate mock prediction based on variety."""
        variety = data.get("variety", "Siling Labuyo")
        shu_range = VARIETY_SHU_RANGES.get(variety, (10000, 50000))
        predicted_shu = int(np.random.uniform(shu_range[0], shu_range[1]))
        
        return {
            "predicted_shu": predicted_shu,
            "heat_category": get_heat_category(predicted_shu),
            "model": "Linear Regression (mock)"
        }
    
    def save_model(self, path: str):
        """Save model to file."""
        if self.model and self.scaler:
            joblib.dump({"model": self.model, "scaler": self.scaler}, path)
            logger.info(f"Model saved to {path}")
    
    def load_model(self, path: str):
        """Load model from file."""
        try:
            data = joblib.load(path)
            self.model = data["model"]
            self.scaler = data["scaler"]
            logger.info(f"Model loaded from {path}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")


class RandomForestHeatPredictor:
    """
    Random Forest Regressor for robust SHU prediction.
    
    Provides prediction intervals using tree predictions.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        self.model = None
        self.feature_names = [
            "pod_length_mm",
            "pod_width_mm",
            "pod_weight_g",
            "flower_diameter_mm",
            "petal_count",
            "color_r",
            "color_g",
            "color_b",
            "saturation",
            "variety_encoded"
        ]
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def build_model(self, n_estimators: int = 100, max_depth: int = 15):
        """Build the Random Forest model."""
        try:
            from sklearn.ensemble import RandomForestRegressor
            
            self.model = RandomForestRegressor(
                n_estimators=n_estimators,
                max_depth=max_depth,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
            logger.info("Random Forest model initialized")
            
        except ImportError:
            logger.warning("scikit-learn not available")
    
    def prepare_features(self, data: Dict) -> np.ndarray:
        """Prepare feature vector from input data."""
        variety = data.get("variety", "Siling Labuyo")
        variety_encoding = {
            "Siling Haba": 0,
            "Siling Labuyo": 1,
            "Siling Demonyo": 2
        }
        
        features = [
            data.get("pod_length_mm", 50),
            data.get("pod_width_mm", 10),
            data.get("pod_weight_g", 5),
            data.get("flower_diameter_mm", 12),
            data.get("petal_count", 5),
            data.get("color_r", 200),
            data.get("color_g", 50),
            data.get("color_b", 50),
            data.get("saturation", 150),
            variety_encoding.get(variety, 1)
        ]
        
        return np.array(features).reshape(1, -1)
    
    def train(self, X: np.ndarray, y: np.ndarray) -> Dict:
        """Train the model."""
        if self.model is None:
            self.build_model()
        
        self.model.fit(X, y)
        
        # Feature importance
        importance = dict(zip(self.feature_names, self.model.feature_importances_))
        
        return {
            "feature_importance": importance,
            "n_estimators": self.model.n_estimators,
            "oob_score": getattr(self.model, 'oob_score_', None)
        }
    
    def predict(self, data: Dict) -> Dict:
        """
        Predict SHU with prediction intervals.
        
        Args:
            data: Dictionary with features
            
        Returns:
            Prediction with mean, min, max, and std
        """
        if self.model is None:
            return self._mock_prediction(data)
        
        X = self.prepare_features(data)
        
        # Get predictions from all trees
        tree_predictions = np.array([
            tree.predict(X)[0] for tree in self.model.estimators_
        ])
        
        mean_pred = int(np.mean(tree_predictions))
        std_pred = float(np.std(tree_predictions))
        
        return {
            "predicted_shu": max(0, mean_pred),
            "heat_category": get_heat_category(mean_pred),
            "confidence_interval": {
                "min": max(0, int(np.percentile(tree_predictions, 5))),
                "max": int(np.percentile(tree_predictions, 95)),
                "std": std_pred
            },
            "model": "Random Forest"
        }
    
    def _mock_prediction(self, data: Dict) -> Dict:
        """Generate mock prediction."""
        variety = data.get("variety", "Siling Labuyo")
        shu_range = VARIETY_SHU_RANGES.get(variety, (10000, 50000))
        mean_shu = int(np.random.uniform(shu_range[0], shu_range[1]))
        std_shu = int((shu_range[1] - shu_range[0]) * 0.1)
        
        return {
            "predicted_shu": mean_shu,
            "heat_category": get_heat_category(mean_shu),
            "confidence_interval": {
                "min": max(0, mean_shu - 2 * std_shu),
                "max": mean_shu + 2 * std_shu,
                "std": float(std_shu)
            },
            "model": "Random Forest (mock)"
        }
    
    def get_feature_importance(self) -> Dict:
        """Get feature importance from trained model."""
        if self.model is None:
            return {}
        
        return dict(zip(self.feature_names, self.model.feature_importances_))
    
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


class HeatPredictor:
    """
    Ensemble heat predictor combining multiple models.
    """
    
    def __init__(
        self,
        lr_model_path: Optional[str] = None,
        rf_model_path: Optional[str] = None
    ):
        self.linear_model = LinearHeatPredictor(lr_model_path)
        self.rf_model = RandomForestHeatPredictor(rf_model_path)
    
    def predict(self, data: Dict) -> Dict:
        """
        Predict SHU using ensemble of models.
        
        Args:
            data: Dictionary with morphological features and variety
            
        Returns:
            Ensemble prediction results
        """
        # Get predictions from both models
        lr_pred = self.linear_model.predict(data)
        rf_pred = self.rf_model.predict(data)
        
        # Ensemble (weighted average)
        lr_weight = 0.3
        rf_weight = 0.7
        
        ensemble_shu = int(
            lr_weight * lr_pred["predicted_shu"] +
            rf_weight * rf_pred["predicted_shu"]
        )
        
        # Calculate confidence based on model agreement
        agreement = 1 - abs(
            lr_pred["predicted_shu"] - rf_pred["predicted_shu"]
        ) / max(lr_pred["predicted_shu"], rf_pred["predicted_shu"], 1)
        
        return {
            "predicted_shu": ensemble_shu,
            "heat_category": get_heat_category(ensemble_shu),
            "confidence": min(1.0, max(0.5, agreement)),
            "prediction_range": {
                "min_shu": rf_pred["confidence_interval"]["min"],
                "max_shu": rf_pred["confidence_interval"]["max"]
            },
            "model_predictions": {
                "linear_regression": lr_pred["predicted_shu"],
                "random_forest": rf_pred["predicted_shu"]
            }
        }
