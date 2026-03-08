"""
ML Model Schemas
================

Pydantic models for ML model management.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class ModelType(str, Enum):
    """ML model type enumeration."""
    CNN = "CNN"
    LINEAR_REGRESSION = "Linear_Regression"
    RANDOM_FOREST = "Random_Forest"
    DECISION_TREE = "Decision_Tree"
    ENSEMBLE = "Ensemble"


class ModelStatus(str, Enum):
    """Model status enumeration."""
    TRAINING = "training"
    TRAINED = "trained"
    DEPLOYED = "deployed"
    DEPRECATED = "deprecated"


class HyperParameters(BaseModel):
    """Model hyperparameters."""
    learning_rate: Optional[float] = None
    batch_size: Optional[int] = None
    epochs: Optional[int] = None
    n_estimators: Optional[int] = None
    max_depth: Optional[int] = None
    min_samples_split: Optional[int] = None
    min_samples_leaf: Optional[int] = None
    random_state: Optional[int] = 42


class TrainingDataInfo(BaseModel):
    """Training data information."""
    dataset_size: int
    training_samples: int
    validation_samples: int
    test_samples: int
    data_split_ratio: str
    augmentation_applied: bool = False
    augmentation_methods: Optional[List[str]] = None


class ClassificationMetrics(BaseModel):
    """Classification performance metrics."""
    accuracy: float = Field(..., ge=0, le=1)
    precision: float = Field(..., ge=0, le=1)
    recall: float = Field(..., ge=0, le=1)
    f1_score: float = Field(..., ge=0, le=1)
    confusion_matrix: Optional[List[List[int]]] = None
    class_report: Optional[Dict[str, Any]] = None


class RegressionMetrics(BaseModel):
    """Regression performance metrics."""
    mae: float = Field(..., ge=0)  # Mean Absolute Error
    rmse: float = Field(..., ge=0)  # Root Mean Squared Error
    r2_score: float  # R-squared
    mape: Optional[float] = None  # Mean Absolute Percentage Error


class ModelPerformanceMetrics(BaseModel):
    """Combined model performance metrics."""
    # Classification metrics (for CNN)
    classification: Optional[ClassificationMetrics] = None
    
    # Regression metrics (for SHU prediction)
    regression: Optional[RegressionMetrics] = None
    
    # Inference performance
    avg_inference_time_ms: float
    
    # Variety-specific performance
    variety_metrics: Optional[Dict[str, Dict[str, float]]] = None


class ModelArchitecture(BaseModel):
    """Model architecture details."""
    layers: Optional[List[Dict[str, Any]]] = None
    input_shape: List[int]
    output_shape: List[int]
    total_params: Optional[int] = None
    trainable_params: Optional[int] = None


class MLModelCreate(BaseModel):
    """Schema for creating a new model record."""
    model_name: str
    model_type: ModelType
    version: str
    description: Optional[str] = None
    hyperparameters: Optional[HyperParameters] = None


class MLModelUpdate(BaseModel):
    """Schema for updating a model record."""
    description: Optional[str] = None
    is_active: Optional[bool] = None
    performance_metrics: Optional[ModelPerformanceMetrics] = None


class MLModelResponse(BaseModel):
    """Schema for model response."""
    model_id: str
    model_name: str
    model_type: ModelType
    version: str
    description: Optional[str] = None
    status: ModelStatus
    
    architecture: Optional[ModelArchitecture] = None
    hyperparameters: Optional[HyperParameters] = None
    training_data: Optional[TrainingDataInfo] = None
    performance_metrics: Optional[ModelPerformanceMetrics] = None
    
    model_file_path: Optional[str] = None
    is_active: bool = False
    
    created_at: datetime
    trained_at: Optional[datetime] = None
    trained_by: Optional[str] = None
    
    class Config:
        from_attributes = True


class ModelListResponse(BaseModel):
    """List of models response."""
    models: List[MLModelResponse]
    total: int


class TrainingRequest(BaseModel):
    """Request to train a new model."""
    model_type: ModelType
    model_name: str
    dataset_path: Optional[str] = None
    hyperparameters: Optional[HyperParameters] = None
    
    # Training options
    use_augmentation: bool = True
    validation_split: float = Field(0.2, ge=0.1, le=0.4)
    test_split: float = Field(0.1, ge=0.05, le=0.2)
    early_stopping_patience: int = Field(10, ge=1)


class TrainingProgress(BaseModel):
    """Training progress update."""
    model_id: str
    epoch: int
    total_epochs: int
    train_loss: float
    val_loss: float
    train_accuracy: Optional[float] = None
    val_accuracy: Optional[float] = None
    elapsed_time_seconds: float
    estimated_time_remaining: Optional[float] = None


class TrainingResult(BaseModel):
    """Training completion result."""
    model_id: str
    model_name: str
    model_type: ModelType
    version: str
    
    training_time_seconds: float
    final_metrics: ModelPerformanceMetrics
    
    best_epoch: int
    total_epochs: int
    early_stopped: bool
    
    model_path: str


class ModelComparisonRequest(BaseModel):
    """Request to compare models."""
    model_ids: List[str] = Field(..., min_length=2, max_length=5)
    test_dataset_id: Optional[str] = None


class ModelComparisonResponse(BaseModel):
    """Model comparison response."""
    models: List[MLModelResponse]
    comparison_metrics: Dict[str, Dict[str, float]]
    best_model_id: str
    recommendation: str


class ModelDeployRequest(BaseModel):
    """Request to deploy a model."""
    model_id: str
    replace_active: bool = True


class ModelDeployResponse(BaseModel):
    """Model deployment response."""
    model_id: str
    model_type: ModelType
    version: str
    deployed_at: datetime
    previous_model_id: Optional[str] = None
    status: str
