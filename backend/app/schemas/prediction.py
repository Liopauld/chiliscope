"""
Prediction Schemas
==================

Pydantic models for ML prediction requests and responses.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum

from .sample import (
    ChiliVariety,
    HeatCategory,
    MaturityStage,
    ColorRGB,
    ColorHSV,
    FlowerMorphology,
    PodMorphology,
)


class ModelType(str, Enum):
    """ML model type enumeration."""
    CNN = "CNN"
    LINEAR_REGRESSION = "Linear_Regression"
    RANDOM_FOREST = "Random_Forest"
    DECISION_TREE = "Decision_Tree"


class VarietyClassification(BaseModel):
    """Variety classification prediction result."""
    predicted_variety: ChiliVariety
    confidence: float = Field(..., ge=0, le=1)
    probabilities: Dict[str, float]


class HeatLevelPrediction(BaseModel):
    """Heat level prediction result."""
    predicted_shu: int = Field(..., ge=0)
    heat_category: HeatCategory
    confidence: float = Field(..., ge=0, le=1)
    min_shu: int = Field(..., ge=0)
    max_shu: int = Field(..., ge=0)
    
    # Model-specific predictions
    linear_regression_shu: Optional[int] = None
    random_forest_shu: Optional[int] = None
    ensemble_shu: Optional[int] = None


class MaturityScore(BaseModel):
    """Maturity assessment result."""
    score: float = Field(..., ge=0, le=100)
    stage: MaturityStage
    days_to_harvest: Optional[int] = None
    confidence: float = Field(..., ge=0, le=1)


class MeasurementData(BaseModel):
    """Automated measurement results."""
    pod_length_mm: Optional[float] = None
    pod_width_mm: Optional[float] = None
    flower_diameter_mm: Optional[float] = None
    scale_reference_detected: bool = False
    pixels_per_mm: Optional[float] = None


class FeatureExtractionResult(BaseModel):
    """Feature extraction result from images."""
    color_features: Dict[str, Any]
    shape_features: Dict[str, Any]
    texture_features: Dict[str, Any]
    morphological_features: Dict[str, Any]


class PredictionRequest(BaseModel):
    """Request schema for analysis prediction."""
    sample_id: str
    include_measurements: bool = True
    include_maturity: bool = True
    model_preference: Optional[ModelType] = None


class AnalysisRequest(BaseModel):
    """Request schema for full image analysis."""
    image_ids: List[str]
    known_variety: Optional[ChiliVariety] = None
    days_since_flowering: Optional[int] = None
    include_recommendations: bool = True


class PredictionResponse(BaseModel):
    """Complete prediction response."""
    sample_id: str
    analysis_id: str
    
    # Classification results
    variety_classification: VarietyClassification
    
    # Heat prediction results
    heat_level: HeatLevelPrediction
    
    # Maturity assessment
    maturity: MaturityScore
    
    # Measurements
    measurements: Optional[MeasurementData] = None
    
    # Extracted features
    features: Optional[FeatureExtractionResult] = None
    
    # Processing info
    processing_time_ms: float
    model_versions: Dict[str, str]
    
    # Timestamp
    created_at: datetime


class BatchPredictionRequest(BaseModel):
    """Request for batch predictions."""
    sample_ids: List[str] = Field(..., min_length=1, max_length=50)
    include_recommendations: bool = False


class BatchPredictionResponse(BaseModel):
    """Response for batch predictions."""
    predictions: List[PredictionResponse]
    total_processed: int
    failed_count: int
    total_time_ms: float


class ModelComparisonRequest(BaseModel):
    """Request to compare model predictions."""
    sample_id: str
    models: List[ModelType] = Field(
        default=[ModelType.LINEAR_REGRESSION, ModelType.RANDOM_FOREST]
    )


class ModelComparisonResult(BaseModel):
    """Result of model comparison."""
    model_type: ModelType
    predicted_shu: int
    confidence: float
    mae: Optional[float] = None
    rmse: Optional[float] = None


class ModelComparisonResponse(BaseModel):
    """Response for model comparison."""
    sample_id: str
    results: List[ModelComparisonResult]
    best_model: ModelType
    ensemble_prediction: int


class ConfidenceBreakdown(BaseModel):
    """Detailed confidence breakdown."""
    overall_confidence: float
    variety_confidence: float
    heat_confidence: float
    maturity_confidence: float
    image_quality_score: float
    factors: List[str]  # Factors affecting confidence


class PredictionExplanation(BaseModel):
    """Explainable prediction result."""
    prediction: PredictionResponse
    confidence_breakdown: ConfidenceBreakdown
    feature_importance: Dict[str, float]
    similar_samples: List[str]
    explanation_text: str
