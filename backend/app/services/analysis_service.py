"""
Analysis Service
================

Orchestrates ML analysis pipeline for chili samples.
"""

import logging
from typing import Dict, Optional, Any
from datetime import datetime
import numpy as np

from ..ml import (
    ImageProcessor,
    VarietyClassifier,
    HeatPredictor,
    MaturityPredictor,
    AutomatedMeasurement,
    RecommendationEngine
)

logger = logging.getLogger(__name__)


class AnalysisService:
    """
    Main analysis service that orchestrates all ML components.
    """
    
    def __init__(
        self,
        variety_model_path: Optional[str] = None,
        heat_model_path: Optional[str] = None,
        maturity_model_path: Optional[str] = None
    ):
        """
        Initialize analysis service with ML models.
        
        Args:
            variety_model_path: Path to variety classifier model
            heat_model_path: Path to heat predictor model
            maturity_model_path: Path to maturity predictor model
        """
        # Initialize components
        self.image_processor = ImageProcessor()
        self.variety_classifier = VarietyClassifier(variety_model_path)
        self.heat_predictor = HeatPredictor(heat_model_path)
        self.maturity_predictor = MaturityPredictor(maturity_model_path)
        self.measurement_service = AutomatedMeasurement()
        self.recommendation_engine = RecommendationEngine()
        
        logger.info("AnalysisService initialized")
    
    async def analyze_sample(
        self,
        image_path: str,
        sample_data: Optional[Dict] = None
    ) -> Dict:
        """
        Perform full analysis on a chili sample.
        
        Args:
            image_path: Path to the sample image
            sample_data: Optional additional sample data
            
        Returns:
            Complete analysis results
        """
        analysis_start = datetime.now()
        
        try:
            # Load and preprocess image
            image = self.image_processor.load_image(image_path)
            enhanced = self.image_processor.enhance_image(image)
            preprocessed = self.image_processor.preprocess_image(enhanced)
            
            # Extract features
            features = self.image_processor.extract_all_features(image)
            
            # Classify variety
            variety_result = self.variety_classifier.predict(preprocessed)
            
            # Get measurements
            measurements = self.measurement_service.measure_all(image)
            
            # Prepare data for heat prediction
            color_features = features.get("color_features", {})
            heat_input = {
                "variety": variety_result["predicted_variety"],
                "pod_length_mm": measurements.get("measurements", {}).get("pod_length_mm", 50),
                "pod_width_mm": measurements.get("measurements", {}).get("pod_width_mm", 10),
                "pod_weight_g": sample_data.get("weight_g", 5) if sample_data else 5,
                "flower_diameter_mm": measurements.get("measurements", {}).get("flower_diameter_mm", 12),
                "petal_count": sample_data.get("petal_count", 5) if sample_data else 5,
                "color_r": color_features.get("mean_rgb", {}).get("r", 200),
                "color_g": color_features.get("mean_rgb", {}).get("g", 50),
                "color_b": color_features.get("mean_rgb", {}).get("b", 50),
                "saturation": color_features.get("saturation", 150)
            }
            
            # Predict heat level
            heat_result = self.heat_predictor.predict(heat_input)
            
            # Prepare data for maturity prediction
            maturity_input = {
                "color": color_features.get("mean_rgb", {}),
                "hsv": color_features.get("mean_hsv", {}),
                "days_since_flowering": sample_data.get("days_since_flowering", 30) if sample_data else 30,
                "current_size_mm": measurements.get("measurements", {}).get("pod_length_mm", 30),
                "expected_size_mm": self._get_expected_size(variety_result["predicted_variety"]),
                "texture_score": features.get("texture_features", {}).get("texture_uniformity", 0.5)
            }
            
            # Predict maturity
            maturity_result = self.maturity_predictor.predict(maturity_input)
            
            # Generate recommendations
            recommendations = self.recommendation_engine.generate_recommendations(
                predicted_shu=heat_result["predicted_shu"],
                variety=variety_result["predicted_variety"],
                heat_category=heat_result["heat_category"],
                maturity_stage=maturity_result["stage"]
            )
            
            analysis_time = (datetime.now() - analysis_start).total_seconds()
            
            return {
                "success": True,
                "analysis_id": f"analysis_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "timestamp": datetime.now().isoformat(),
                "processing_time_seconds": round(analysis_time, 2),
                "image_quality_score": features.get("quality_score", 0),
                "variety_classification": variety_result,
                "heat_prediction": heat_result,
                "maturity_assessment": maturity_result,
                "measurements": measurements,
                "extracted_features": features,
                "recommendations": recommendations
            }
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    async def analyze_from_bytes(
        self,
        image_bytes: bytes,
        sample_data: Optional[Dict] = None
    ) -> Dict:
        """
        Perform analysis on image from bytes.
        
        Args:
            image_bytes: Image data as bytes
            sample_data: Optional additional sample data
            
        Returns:
            Analysis results
        """
        try:
            image = self.image_processor.load_image_from_bytes(image_bytes)
            
            # Save temporarily for processing
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
                import cv2
                cv2.imwrite(f.name, image)
                temp_path = f.name
            
            try:
                result = await self.analyze_sample(temp_path, sample_data)
            finally:
                os.unlink(temp_path)
            
            return result
            
        except Exception as e:
            logger.error(f"Analysis from bytes failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _get_expected_size(self, variety: str) -> float:
        """Get expected mature size for a variety."""
        sizes = {
            "Siling Haba": 120,  # mm
            "Siling Labuyo": 30,
            "Siling Demonyo": 25
        }
        return sizes.get(variety, 50)
    
    async def quick_classify(self, image_path: str) -> Dict:
        """
        Quick variety classification only.
        
        Args:
            image_path: Path to image
            
        Returns:
            Variety classification result
        """
        try:
            image = self.image_processor.load_image(image_path)
            preprocessed = self.image_processor.preprocess_image(image)
            return self.variety_classifier.predict(preprocessed)
        except Exception as e:
            logger.error(f"Classification failed: {e}")
            return {"error": str(e)}
    
    async def batch_analyze(
        self,
        image_paths: list,
        sample_data_list: Optional[list] = None
    ) -> Dict:
        """
        Analyze multiple samples.
        
        Args:
            image_paths: List of image paths
            sample_data_list: Optional list of sample data dicts
            
        Returns:
            Batch analysis results
        """
        results = []
        successful = 0
        failed = 0
        
        for i, path in enumerate(image_paths):
            sample_data = sample_data_list[i] if sample_data_list and i < len(sample_data_list) else None
            result = await self.analyze_sample(path, sample_data)
            results.append(result)
            
            if result.get("success"):
                successful += 1
            else:
                failed += 1
        
        # Aggregate statistics
        shu_values = [r["heat_prediction"]["predicted_shu"] for r in results if r.get("success")]
        varieties = [r["variety_classification"]["predicted_variety"] for r in results if r.get("success")]
        
        return {
            "total": len(image_paths),
            "successful": successful,
            "failed": failed,
            "results": results,
            "summary": {
                "avg_shu": np.mean(shu_values) if shu_values else 0,
                "min_shu": min(shu_values) if shu_values else 0,
                "max_shu": max(shu_values) if shu_values else 0,
                "variety_distribution": {v: varieties.count(v) for v in set(varieties)}
            }
        }
    
    def get_model_info(self) -> Dict:
        """Get information about loaded models."""
        return {
            "variety_classifier": {
                "loaded": self.variety_classifier.model is not None,
                "model_path": self.variety_classifier.model_path,
                "input_shape": self.variety_classifier.input_shape,
                "num_classes": self.variety_classifier.num_classes
            },
            "heat_predictor": {
                "linear_loaded": self.heat_predictor.linear_model.model is not None,
                "rf_loaded": self.heat_predictor.rf_model.model is not None
            },
            "maturity_predictor": {
                "loaded": self.maturity_predictor.model is not None
            }
        }
