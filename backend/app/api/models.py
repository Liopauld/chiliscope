"""
ML Models Routes
================

Endpoints for model management (admin).
"""

from typing import Optional, List
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import MongoDB, Collections
from app.core.security import require_admin, require_researcher
from app.schemas.model import (
    MLModelCreate,
    MLModelUpdate,
    MLModelResponse,
    ModelListResponse,
    TrainingRequest,
    TrainingResult,
    ModelComparisonRequest,
    ModelComparisonResponse,
    ModelDeployRequest,
    ModelDeployResponse,
    ModelStatus,
    ModelType,
    ModelPerformanceMetrics,
    ClassificationMetrics,
    RegressionMetrics,
)

router = APIRouter()


@router.get("/", response_model=ModelListResponse)
async def list_models(
    model_type: Optional[ModelType] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(require_researcher)
):
    """List all ML models."""
    collection = MongoDB.get_collection(Collections.ML_MODELS)
    
    query = {}
    if model_type:
        query["model_type"] = model_type.value
    if is_active is not None:
        query["is_active"] = is_active
    
    cursor = collection.find(query).sort("created_at", -1)
    models = await cursor.to_list(length=100)
    
    model_responses = [
        MLModelResponse(
            model_id=model["model_id"],
            model_name=model["model_name"],
            model_type=model["model_type"],
            version=model["version"],
            description=model.get("description"),
            status=model.get("status", ModelStatus.TRAINED),
            architecture=model.get("architecture"),
            hyperparameters=model.get("hyperparameters"),
            training_data=model.get("training_data"),
            performance_metrics=model.get("performance_metrics"),
            model_file_path=model.get("model_file_path"),
            is_active=model.get("is_active", False),
            created_at=model["created_at"],
            trained_at=model.get("trained_at"),
            trained_by=model.get("trained_by")
        )
        for model in models
    ]
    
    return ModelListResponse(models=model_responses, total=len(model_responses))


@router.get("/active", response_model=List[MLModelResponse])
async def get_active_models():
    """Get currently active (deployed) models."""
    collection = MongoDB.get_collection(Collections.ML_MODELS)
    
    cursor = collection.find({"is_active": True})
    models = await cursor.to_list(length=10)
    
    return [
        MLModelResponse(
            model_id=model["model_id"],
            model_name=model["model_name"],
            model_type=model["model_type"],
            version=model["version"],
            description=model.get("description"),
            status=model.get("status", ModelStatus.DEPLOYED),
            performance_metrics=model.get("performance_metrics"),
            is_active=True,
            created_at=model["created_at"],
            trained_at=model.get("trained_at")
        )
        for model in models
    ]


@router.get("/{model_id}", response_model=MLModelResponse)
async def get_model(
    model_id: str,
    current_user: dict = Depends(require_researcher)
):
    """Get a specific model by ID."""
    collection = MongoDB.get_collection(Collections.ML_MODELS)
    
    model = await collection.find_one({"model_id": model_id})
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    return MLModelResponse(
        model_id=model["model_id"],
        model_name=model["model_name"],
        model_type=model["model_type"],
        version=model["version"],
        description=model.get("description"),
        status=model.get("status", ModelStatus.TRAINED),
        architecture=model.get("architecture"),
        hyperparameters=model.get("hyperparameters"),
        training_data=model.get("training_data"),
        performance_metrics=model.get("performance_metrics"),
        model_file_path=model.get("model_file_path"),
        is_active=model.get("is_active", False),
        created_at=model["created_at"],
        trained_at=model.get("trained_at"),
        trained_by=model.get("trained_by")
    )


@router.post("/train", response_model=TrainingResult)
async def train_model(
    request: TrainingRequest,
    current_user: dict = Depends(require_admin)
):
    """
    Train a new ML model.
    
    This is a placeholder endpoint. In production, this would:
    1. Queue a training job
    2. Return a job ID to track progress
    3. Actually train the model using the specified parameters
    """
    import random
    
    collection = MongoDB.get_collection(Collections.ML_MODELS)
    
    model_id = str(uuid.uuid4())
    version = f"v{random.randint(1, 3)}.{random.randint(0, 9)}.0"
    
    # Simulate training (in production, this would be async)
    training_time = random.uniform(60, 300)
    
    # Generate mock metrics based on model type
    if request.model_type == ModelType.CNN:
        metrics = ModelPerformanceMetrics(
            classification=ClassificationMetrics(
                accuracy=random.uniform(0.88, 0.96),
                precision=random.uniform(0.85, 0.95),
                recall=random.uniform(0.85, 0.95),
                f1_score=random.uniform(0.85, 0.95),
                confusion_matrix=[[45, 3, 2], [2, 48, 0], [1, 2, 47]]
            ),
            avg_inference_time_ms=random.uniform(50, 200)
        )
    else:
        metrics = ModelPerformanceMetrics(
            regression=RegressionMetrics(
                mae=random.uniform(2000, 5000),
                rmse=random.uniform(3000, 7000),
                r2_score=random.uniform(0.75, 0.92),
                mape=random.uniform(8, 15)
            ),
            avg_inference_time_ms=random.uniform(5, 30)
        )
    
    # Store model record
    model_doc = {
        "model_id": model_id,
        "model_name": request.model_name,
        "model_type": request.model_type.value,
        "version": version,
        "status": ModelStatus.TRAINED.value,
        "hyperparameters": request.hyperparameters.model_dump() if request.hyperparameters else None,
        "training_data": {
            "dataset_size": random.randint(1000, 3000),
            "training_samples": random.randint(700, 2100),
            "validation_samples": random.randint(150, 450),
            "test_samples": random.randint(100, 300),
            "data_split_ratio": "70/20/10",
            "augmentation_applied": request.use_augmentation
        },
        "performance_metrics": metrics.model_dump(),
        "model_file_path": f"ml/models/{request.model_name.lower().replace(' ', '_')}_{version}.h5",
        "is_active": False,
        "created_at": datetime.utcnow(),
        "trained_at": datetime.utcnow(),
        "trained_by": current_user["user_id"]
    }
    
    await collection.insert_one(model_doc)
    
    return TrainingResult(
        model_id=model_id,
        model_name=request.model_name,
        model_type=request.model_type,
        version=version,
        training_time_seconds=training_time,
        final_metrics=metrics,
        best_epoch=random.randint(30, 80),
        total_epochs=100,
        early_stopped=random.choice([True, False]),
        model_path=model_doc["model_file_path"]
    )


@router.post("/deploy", response_model=ModelDeployResponse)
async def deploy_model(
    request: ModelDeployRequest,
    current_user: dict = Depends(require_admin)
):
    """Deploy a model to production."""
    collection = MongoDB.get_collection(Collections.ML_MODELS)
    
    # Get model to deploy
    model = await collection.find_one({"model_id": request.model_id})
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )
    
    previous_model_id = None
    
    if request.replace_active:
        # Deactivate current active model of same type
        current_active = await collection.find_one({
            "model_type": model["model_type"],
            "is_active": True
        })
        
        if current_active:
            previous_model_id = current_active["model_id"]
            await collection.update_one(
                {"model_id": previous_model_id},
                {"$set": {"is_active": False, "status": ModelStatus.DEPRECATED.value}}
            )
    
    # Activate new model
    await collection.update_one(
        {"model_id": request.model_id},
        {"$set": {"is_active": True, "status": ModelStatus.DEPLOYED.value}}
    )
    
    return ModelDeployResponse(
        model_id=request.model_id,
        model_type=model["model_type"],
        version=model["version"],
        deployed_at=datetime.utcnow(),
        previous_model_id=previous_model_id,
        status="deployed"
    )


@router.get("/compare/performance")
async def compare_model_performance(
    model_ids: str,  # Comma-separated
    current_user: dict = Depends(require_researcher)
):
    """Compare performance of multiple models."""
    collection = MongoDB.get_collection(Collections.ML_MODELS)
    
    ids = model_ids.split(",")
    
    if len(ids) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 model IDs required for comparison"
        )
    
    cursor = collection.find({"model_id": {"$in": ids}})
    models = await cursor.to_list(length=10)
    
    if len(models) < 2:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more models not found"
        )
    
    comparison = []
    for model in models:
        metrics = model.get("performance_metrics", {})
        comparison.append({
            "model_id": model["model_id"],
            "model_name": model["model_name"],
            "model_type": model["model_type"],
            "version": model["version"],
            "is_active": model.get("is_active", False),
            "classification": metrics.get("classification"),
            "regression": metrics.get("regression"),
            "avg_inference_time_ms": metrics.get("avg_inference_time_ms")
        })
    
    # Determine best model
    best_model = max(comparison, key=lambda x: (
        x.get("classification", {}).get("accuracy", 0) if x.get("classification") 
        else x.get("regression", {}).get("r2_score", 0) if x.get("regression")
        else 0
    ))
    
    return {
        "models": comparison,
        "best_model_id": best_model["model_id"],
        "comparison_date": datetime.utcnow()
    }
