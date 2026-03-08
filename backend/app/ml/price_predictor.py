"""
Price Predictor — Random Forest-based Chili Price Prediction
=============================================================

Uses a trained Random Forest model to predict future chili prices
based on historical price data and time-series features.
"""

import os
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd
import joblib

logger = logging.getLogger(__name__)

# Path to saved model artifacts
MODEL_DIR = Path(__file__).parent / "models"


class PricePredictor:
    """Predicts chili prices using a trained Random Forest model."""

    def __init__(self):
        self.model = None
        self.encoder = None
        self.metadata = None
        self.feature_columns = None
        self.price_history = None
        self._loaded = False

    def load(self) -> bool:
        """Load model artifacts from disk."""
        try:
            model_path = MODEL_DIR / "price_rf_model.joblib"
            encoder_path = MODEL_DIR / "chili_type_encoder.joblib"
            metadata_path = MODEL_DIR / "price_model_metadata.json"
            history_path = MODEL_DIR / "price_history.csv"

            if not model_path.exists():
                logger.warning("Price prediction model not found at %s", model_path)
                return False

            self.model = joblib.load(model_path)
            self.encoder = joblib.load(encoder_path)

            with open(metadata_path, "r") as f:
                self.metadata = json.load(f)

            self.feature_columns = self.metadata["feature_columns"]

            # Load price history
            self.price_history = pd.read_csv(history_path, parse_dates=["date"])

            self._loaded = True
            logger.info(
                "Price prediction model loaded (R²=%.4f, MAE=₱%.2f)",
                self.metadata["metrics"]["test_r2"],
                self.metadata["metrics"]["test_mae"],
            )
            return True

        except Exception as e:
            logger.error("Failed to load price prediction model: %s", e)
            return False

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    def _engineer_features_for_date(
        self,
        target_date: datetime,
        chili_type: str,
        history: pd.DataFrame,
    ) -> dict:
        """Create feature vector for a single prediction date."""
        # Time-based features
        features = {
            "day_of_week": target_date.weekday(),
            "day_of_month": target_date.day,
            "month": target_date.month,
            "quarter": (target_date.month - 1) // 3 + 1,
            "week_of_year": int(target_date.isocalendar()[1]),
            "is_weekend": 1 if target_date.weekday() >= 5 else 0,
            "month_sin": np.sin(2 * np.pi * target_date.month / 12),
            "month_cos": np.cos(2 * np.pi * target_date.month / 12),
            "dow_sin": np.sin(2 * np.pi * target_date.weekday() / 7),
            "dow_cos": np.cos(2 * np.pi * target_date.weekday() / 7),
        }

        # Get sorted prices for this chili type
        type_history = (
            history[history["chili_type"] == chili_type]
            .sort_values("date")
            .reset_index(drop=True)
        )
        prices = type_history["price"].values

        # Lag features
        for lag in [1, 2, 3, 5, 7, 14, 21, 30]:
            if len(prices) >= lag:
                features[f"price_lag_{lag}"] = prices[-lag]
            else:
                features[f"price_lag_{lag}"] = prices[-1] if len(prices) > 0 else 0

        # Rolling window features
        for window in [3, 7, 14, 30]:
            window_data = prices[-window:] if len(prices) >= window else prices
            if len(window_data) > 0:
                features[f"rolling_mean_{window}"] = np.mean(window_data)
                features[f"rolling_std_{window}"] = (
                    np.std(window_data) if len(window_data) > 1 else 0
                )
                features[f"rolling_min_{window}"] = np.min(window_data)
                features[f"rolling_max_{window}"] = np.max(window_data)
            else:
                features[f"rolling_mean_{window}"] = 0
                features[f"rolling_std_{window}"] = 0
                features[f"rolling_min_{window}"] = 0
                features[f"rolling_max_{window}"] = 0

        # Price change features
        if len(prices) >= 2:
            features["price_change_1d"] = prices[-1] - prices[-2]
            features["price_pct_change_1d"] = (
                (prices[-1] - prices[-2]) / prices[-2] if prices[-2] != 0 else 0
            )
        else:
            features["price_change_1d"] = 0
            features["price_pct_change_1d"] = 0

        if len(prices) >= 8:
            features["price_change_7d"] = prices[-1] - prices[-8]
            features["price_pct_change_7d"] = (
                (prices[-1] - prices[-8]) / prices[-8] if prices[-8] != 0 else 0
            )
        else:
            features["price_change_7d"] = 0
            features["price_pct_change_7d"] = 0

        # Price spread (use last known spread)
        if "low" in type_history.columns and "high" in type_history.columns:
            last_row = type_history.iloc[-1]
            low = last_row.get("low", 0)
            high = last_row.get("high", 0)
            features["price_spread"] = (
                (high - low) if pd.notna(high) and pd.notna(low) else 0
            )
        else:
            features["price_spread"] = 0

        # Days since start
        if len(type_history) > 0:
            start_date = type_history["date"].min()
            features["days_since_start"] = (target_date - start_date).days
        else:
            features["days_since_start"] = 0

        # Chili type encoded
        try:
            features["chili_type_encoded"] = int(
                self.encoder.transform([chili_type])[0]
            )
        except ValueError:
            features["chili_type_encoded"] = 0

        return features

    def predict(
        self,
        chili_type: str,
        days_ahead: int = 7,
        from_date: Optional[datetime] = None,
    ) -> dict:
        """
        Predict chili prices for the next N days.

        Args:
            chili_type: 'siling_labuyo' or 'siling_haba'
            days_ahead: Number of days to forecast (1-30)
            from_date: Start date for predictions (defaults to today)

        Returns:
            Dict with predictions, confidence info, and metadata
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")

        if from_date is None:
            from_date = datetime.now()

        days_ahead = max(1, min(days_ahead, 90))

        # Build a rolling history that gets updated with each prediction
        history = self.price_history.copy()
        predictions = []

        for day_offset in range(1, days_ahead + 1):
            target_date = from_date + timedelta(days=day_offset)

            # Engineer features
            feat_dict = self._engineer_features_for_date(
                target_date, chili_type, history
            )

            # Build feature vector in correct order
            feat_vector = np.array(
                [[feat_dict.get(col, 0) for col in self.feature_columns]]
            )

            # Predict
            predicted_price = float(self.model.predict(feat_vector)[0])
            predicted_price = max(0, predicted_price)  # No negative prices

            predictions.append(
                {
                    "date": target_date.strftime("%Y-%m-%d"),
                    "predicted_price": round(predicted_price, 2),
                    "day_offset": day_offset,
                }
            )

            # Add prediction to history for next iteration (rolling forecast)
            new_row = pd.DataFrame(
                [
                    {
                        "date": target_date,
                        "price": predicted_price,
                        "chili_type": chili_type,
                        "low": np.nan,
                        "high": np.nan,
                    }
                ]
            )
            history = pd.concat([history, new_row], ignore_index=True)

        # Get recent actual prices for context
        type_history = (
            self.price_history[self.price_history["chili_type"] == chili_type]
            .sort_values("date")
            .tail(7)
        )
        recent_prices = [
            {
                "date": row["date"].strftime("%Y-%m-%d"),
                "price": round(row["price"], 2),
            }
            for _, row in type_history.iterrows()
        ]

        # Compute trend
        pred_prices = [p["predicted_price"] for p in predictions]
        if len(pred_prices) > 1:
            trend = "increasing" if pred_prices[-1] > pred_prices[0] else "decreasing"
            trend_pct = round(
                (pred_prices[-1] - pred_prices[0]) / pred_prices[0] * 100, 2
            )
        else:
            trend = "stable"
            trend_pct = 0

        return {
            "chili_type": chili_type,
            "predictions": predictions,
            "recent_prices": recent_prices,
            "summary": {
                "avg_predicted": round(np.mean(pred_prices), 2),
                "min_predicted": round(min(pred_prices), 2),
                "max_predicted": round(max(pred_prices), 2),
                "trend": trend,
                "trend_pct": trend_pct,
            },
            "model_info": {
                "type": "RandomForestRegressor",
                "r2_score": self.metadata["metrics"]["test_r2"],
                "mae": self.metadata["metrics"]["test_mae"],
                "trained_at": self.metadata["trained_at"],
            },
        }

    def get_model_info(self) -> dict:
        """Return model metadata and performance metrics."""
        if not self._loaded:
            return {"loaded": False}
        return {
            "loaded": True,
            "model_type": self.metadata["model_type"],
            "metrics": self.metadata["metrics"],
            "best_params": self.metadata["best_params"],
            "feature_count": len(self.feature_columns),
            "chili_types": self.metadata["chili_types"],
            "trained_at": self.metadata["trained_at"],
            "data_sources": self.metadata["data_sources"],
        }


# Singleton instance
price_predictor = PricePredictor()
