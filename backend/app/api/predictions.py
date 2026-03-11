"""
Predictions Routes
==================

Endpoints for ML predictions on chili samples.
Integrates Roboflow for variety classification.
"""

from typing import Optional
from datetime import datetime
from pathlib import Path
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Request
from PIL import Image
import io

from app.core.database import MongoDB, Collections
from app.core.security import get_current_user
from app.core.rate_limit import limiter
from app.services.roboflow_service import classify_chili_image, roboflow_classifier, roboflow_segmenter, chili_segmenter, maturity_classifier, flower_stress_classifier
from app.ml.shu_predictor import get_shu_predictor
from app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    AnalysisRequest,
    BatchPredictionRequest,
    BatchPredictionResponse,
    VarietyClassification,
    HeatLevelPrediction,
    MaturityScore,
    MeasurementData,
    ModelType,
)
from app.schemas.sample import ChiliVariety, HeatCategory, MaturityStage

router = APIRouter()
logger = logging.getLogger(__name__)


async def run_variety_classification(image_paths: list = None, image: Image.Image = None) -> VarietyClassification:
    """
    Run variety classification using Roboflow model.
    
    Falls back to placeholder values if Roboflow is not configured.
    
    Args:
        image_paths: List of image file paths (legacy support)
        image: PIL Image object for direct classification
    """
    import random
    
    # Try Roboflow classification if configured
    if roboflow_classifier.is_configured:
        try:
            # Use provided image or load from first path
            if image is None and image_paths:
                first_path = image_paths[0]
                if Path(first_path).exists():
                    image = Image.open(first_path)
            
            if image is not None:
                result = await classify_chili_image(image)
                
                if result["success"]:
                    # Map variety name to enum
                    variety_name = result["variety"]
                    variety_map = {
                        "Siling Haba": ChiliVariety.SILING_HABA,
                        "Siling Labuyo": ChiliVariety.SILING_LABUYO,
                        "Siling Demonyo": ChiliVariety.SILING_DEMONYO,
                    }
                    predicted = variety_map.get(variety_name)
                    if predicted is None:
                        logger.warning(f"Unknown variety name '{variety_name}' from Roboflow, defaulting to Siling Labuyo")
                        predicted = ChiliVariety.SILING_LABUYO
                    
                    # Build probabilities from predictions
                    probabilities = {
                        "Siling Haba": 0.1,
                        "Siling Labuyo": 0.1,
                        "Siling Demonyo": 0.1
                    }
                    
                    for pred in result.get("predictions", []):
                        mapped_name = roboflow_classifier.map_to_variety(pred["class"])
                        if mapped_name in probabilities:
                            probabilities[mapped_name] = pred["confidence"]
                    
                    # Normalize
                    total = sum(probabilities.values())
                    if total > 0:
                        probabilities = {k: v/total for k, v in probabilities.items()}
                    
                    logger.info(f"Roboflow classification: {predicted.value} ({result['confidence']:.2%})")
                    
                    return VarietyClassification(
                        predicted_variety=predicted,
                        confidence=result["confidence"],
                        probabilities=probabilities
                    )
                else:
                    logger.warning(f"Roboflow classification failed: {result.get('error')}")
                    
        except Exception as e:
            logger.error(f"Roboflow error, falling back to placeholder: {e}")
    
    # Fallback to placeholder response (for dev/testing)
    logger.info("Using placeholder classification (Roboflow not configured)")
    
    varieties = [ChiliVariety.SILING_HABA, ChiliVariety.SILING_LABUYO, ChiliVariety.SILING_DEMONYO]
    predicted = random.choice(varieties)
    
    probabilities = {
        "Siling Haba": random.uniform(0.1, 0.3),
        "Siling Labuyo": random.uniform(0.1, 0.3),
        "Siling Demonyo": random.uniform(0.1, 0.3)
    }
    probabilities[predicted.value] = random.uniform(0.7, 0.95)
    
    # Normalize
    total = sum(probabilities.values())
    probabilities = {k: v/total for k, v in probabilities.items()}
    
    return VarietyClassification(
        predicted_variety=predicted,
        confidence=probabilities[predicted.value],
        probabilities=probabilities
    )


async def run_heat_prediction(variety: ChiliVariety, features: dict) -> HeatLevelPrediction:
    """
    Run trained regression models for SHU prediction.
    Uses the actual trained Linear Regression + Random Forest models.
    Falls back to variety-based heuristic if models aren't loaded.
    """
    import random
    from ..ml.shu_predictor import get_shu_predictor

    predictor = get_shu_predictor()
    variety_str = variety.value if hasattr(variety, 'value') else str(variety)

    # Extract features if available, else use sensible defaults per variety
    defaults = {
        "Siling Haba": {"length_cm": 8.0, "width_cm": 1.2, "weight_g": 8.0, "wall_thickness_mm": 1.8},
        "Siling Labuyo": {"length_cm": 3.0, "width_cm": 0.6, "weight_g": 2.0, "wall_thickness_mm": 0.8},
        "Siling Demonyo": {"length_cm": 4.5, "width_cm": 1.0, "weight_g": 5.0, "wall_thickness_mm": 1.2},
    }
    d = defaults.get(variety_str, defaults["Siling Labuyo"])

    result = predictor.predict(
        variety=variety_str,
        length_cm=features.get("length_cm", d["length_cm"]),
        width_cm=features.get("width_cm", d["width_cm"]),
        weight_g=features.get("weight_g", d["weight_g"]),
        wall_thickness_mm=features.get("wall_thickness_mm", d["wall_thickness_mm"]),
        color_r=features.get("color_r", 200),
        color_g=features.get("color_g", 50),
        color_b=features.get("color_b", 30),
        days_to_maturity=features.get("days_to_maturity", 65),
        moisture_content=features.get("moisture_content", 0.85),
        seed_count=features.get("seed_count", 30),
        placenta_ratio=features.get("placenta_ratio", 0.3),
        flower_stress_score=features.get("flower_stress_score", 0.0),
        model="ensemble",
    )

    predicted_shu = int(result.get("predicted_shu", 15000))

    # Determine heat category
    if predicted_shu <= 5000:
        category = HeatCategory.MILD
    elif predicted_shu <= 15000:
        category = HeatCategory.MEDIUM
    elif predicted_shu <= 50000:
        category = HeatCategory.HOT
    else:
        category = HeatCategory.EXTRA_HOT

    confidence = result.get("confidence", 0.8)
    interval = result.get("prediction_interval", {})

    return HeatLevelPrediction(
        predicted_shu=predicted_shu,
        heat_category=category,
        confidence=confidence,
        min_shu=interval.get("lower", int(predicted_shu * 0.85)),
        max_shu=interval.get("upper", int(predicted_shu * 1.15)),
        linear_regression_shu=int(result.get("linear_regression_shu", predicted_shu)),
        random_forest_shu=int(result.get("random_forest_shu", predicted_shu))
    )


async def run_maturity_assessment(features: dict) -> MaturityScore:
    """
    Run trained Decision Tree for maturity assessment.
    Uses actual trained model; falls back to heuristic if unavailable.
    """
    import random
    from ..ml.maturity_predictor_trained import get_trained_maturity_predictor

    predictor = get_trained_maturity_predictor()
    result = predictor.predict(
        variety=features.get("variety", "Siling Labuyo"),
        color_r=features.get("color_r", 180),
        color_g=features.get("color_g", 50),
        color_b=features.get("color_b", 30),
        hue=features.get("hue", 15.0),
        saturation=features.get("saturation", 200.0),
        value_hsv=features.get("value_hsv", 180.0),
        days_to_maturity=features.get("days_to_maturity", 65.0),
    )

    score = result["maturity_percentage"]  # 0-100

    if score < 25:
        stage = MaturityStage.IMMATURE
        days = max(0, int((25 - score) / 25 * 20))
    elif score < 60:
        stage = MaturityStage.DEVELOPING
        days = max(0, int((60 - score) / 35 * 10))
    elif score < 85:
        stage = MaturityStage.MATURE
        days = max(0, int((85 - score) / 25 * 5))
    else:
        stage = MaturityStage.OVERRIPE
        days = 0

    confidence = 0.85 if predictor.is_ready else 0.5

    return MaturityScore(
        score=round(score, 1),
        stage=stage,
        days_to_harvest=days,
        confidence=confidence
    )


@router.post("/analyze/{sample_id}", response_model=PredictionResponse)
async def analyze_sample(
    sample_id: str,
    request: Optional[AnalysisRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Run full analysis on a chili sample.
    
    This runs all ML models:
    - CNN for variety classification
    - Random Forest/Linear Regression for SHU prediction
    - Decision Tree for maturity assessment
    """
    import time
    start_time = time.time()
    
    collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    # Get sample
    sample = await collection.find_one({
        "sample_id": sample_id,
        "user_id": current_user["user_id"]
    })
    
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample not found"
        )
    
    # Check if sample has images
    images = sample.get("images", [])
    if not images:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sample has no images to analyze"
        )
    
    # Get image paths for analysis
    image_paths = [img.get("processed_url") for img in images if img.get("processed_url")]
    
    # Run ML predictions
    variety_result = await run_variety_classification(image_paths)
    
    # Use predicted variety for heat prediction
    heat_result = await run_heat_prediction(
        variety_result.predicted_variety,
        {}  # Features would be extracted from images
    )
    
    maturity_result = await run_maturity_assessment({})
    
    # Calculate processing time
    processing_time = (time.time() - start_time) * 1000
    
    # Create prediction response
    analysis_id = str(uuid.uuid4())
    
    prediction = PredictionResponse(
        sample_id=sample_id,
        analysis_id=analysis_id,
        variety_classification=variety_result,
        heat_level=heat_result,
        maturity=maturity_result,
        measurements=MeasurementData(
            pod_length_mm=None,
            pod_width_mm=None,
            flower_diameter_mm=None,
            scale_reference_detected=False
        ),
        processing_time_ms=round(processing_time, 2),
        model_versions={
            "cnn": "v2.1.0",
            "random_forest": "v1.5.0",
            "decision_tree": "v1.2.0",
            "linear_regression": "v1.0.0"
        },
        created_at=datetime.utcnow()
    )
    
    # Update sample with predictions
    await collection.update_one(
        {"sample_id": sample_id},
        {
            "$set": {
                "predictions": {
                    "variety_classification": {
                        "predicted_variety": variety_result.predicted_variety.value,
                        "confidence": variety_result.confidence,
                        "probabilities": variety_result.probabilities
                    },
                    "heat_level": {
                        "predicted_shu": heat_result.predicted_shu,
                        "heat_category": heat_result.heat_category.value,
                        "confidence": heat_result.confidence,
                        "prediction_range": {
                            "min_shu": heat_result.min_shu,
                            "max_shu": heat_result.max_shu
                        }
                    },
                    "maturity_score": {
                        "score": maturity_result.score,
                        "stage": maturity_result.stage.value,
                        "days_to_harvest": maturity_result.days_to_harvest
                    }
                },
                "model_metadata": {
                    "cnn_model_version": "v2.1.0",
                    "processing_time_ms": processing_time
                },
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return prediction


@router.post("/batch", response_model=BatchPredictionResponse)
async def batch_predict(
    request: BatchPredictionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Run predictions on multiple samples.
    """
    import time
    start_time = time.time()
    
    predictions = []
    failed_count = 0
    
    for sample_id in request.sample_ids:
        try:
            # Create a mock AnalysisRequest for each sample
            prediction = await analyze_sample(sample_id, None, current_user)
            predictions.append(prediction)
        except HTTPException:
            failed_count += 1
        except Exception:
            failed_count += 1
    
    total_time = (time.time() - start_time) * 1000
    
    return BatchPredictionResponse(
        predictions=predictions,
        total_processed=len(predictions),
        failed_count=failed_count,
        total_time_ms=round(total_time, 2)
    )


@router.get("/history")
async def get_prediction_history(
    page: int = 1,
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the current user's prediction history, sorted by most recent.
    """
    collection = MongoDB.get_collection("prediction_history")
    
    skip = (page - 1) * limit
    cursor = collection.find(
        {"user_id": current_user["user_id"]}
    ).sort("created_at", -1).skip(skip).limit(limit)
    
    results = []
    async for doc in cursor:
        doc.pop("_id", None)
        results.append(doc)
    
    total = await collection.count_documents({"user_id": current_user["user_id"]})
    
    return {
        "items": results,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/history/{analysis_id}")
async def get_prediction_detail(
    analysis_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get a single prediction history item by analysis_id.
    """
    collection = MongoDB.get_collection("prediction_history")
    doc = await collection.find_one({
        "analysis_id": analysis_id,
        "user_id": current_user["user_id"],
    })
    if not doc:
        raise HTTPException(status_code=404, detail="Analysis not found")
    doc.pop("_id", None)
    return doc


@router.get("/{sample_id}", response_model=PredictionResponse)
async def get_prediction(
    sample_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get existing prediction for a sample."""
    collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    sample = await collection.find_one({
        "sample_id": sample_id,
        "$or": [
            {"user_id": current_user["user_id"]},
            {"is_public": True}
        ]
    })
    
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample not found"
        )
    
    predictions = sample.get("predictions")
    if not predictions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No predictions found for this sample"
        )
    
    variety_pred = predictions.get("variety_classification", {})
    heat_pred = predictions.get("heat_level", {})
    maturity_pred = predictions.get("maturity_score", {})
    model_meta = sample.get("model_metadata", {})
    
    return PredictionResponse(
        sample_id=sample_id,
        analysis_id=sample_id,  # Use sample_id as analysis_id for existing predictions
        variety_classification=VarietyClassification(
            predicted_variety=variety_pred.get("predicted_variety"),
            confidence=variety_pred.get("confidence", 0),
            probabilities=variety_pred.get("probabilities", {})
        ),
        heat_level=HeatLevelPrediction(
            predicted_shu=heat_pred.get("predicted_shu", 0),
            heat_category=heat_pred.get("heat_category", "Mild"),
            confidence=heat_pred.get("confidence", 0),
            min_shu=heat_pred.get("prediction_range", {}).get("min_shu", 0),
            max_shu=heat_pred.get("prediction_range", {}).get("max_shu", 0)
        ),
        maturity=MaturityScore(
            score=maturity_pred.get("score", 0),
            stage=maturity_pred.get("stage", "Immature"),
            days_to_harvest=maturity_pred.get("days_to_harvest"),
            confidence=maturity_pred.get("confidence", 0.5)
        ),
        processing_time_ms=model_meta.get("processing_time_ms", 0),
        model_versions={
            "cnn": model_meta.get("cnn_model_version", "unknown")
        },
        created_at=sample.get("updated_at", sample["created_at"])
    )


@router.post("/classify-image")
@limiter.limit("20/minute")
async def classify_image(
    request: Request,
    file: UploadFile = File(...),
    model_version: Optional[str] = Query(None, description="Roboflow model version override (e.g. '6' for mobile)"),
    current_user: dict = Depends(get_current_user)
):
    """
    Quick classify a chili image using Roboflow.
    
    Classifies the uploaded image and saves the result to
    the user's prediction history for later retrieval.
    
    Returns the predicted variety, confidence, and all predictions.
    """
    import time
    import base64
    start_time = time.time()
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    try:
        # Read and open image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        logger.info(
            f"classify-image: raw file={file.filename}, content_type={file.content_type}, "
            f"size={len(contents)} bytes, image={image.size[0]}x{image.size[1]}, mode={image.mode}"
        )
        
        # Check if image has EXIF orientation data
        exif_orientation = None
        try:
            exif_data = image.getexif()
            exif_orientation = exif_data.get(0x0112)  # 0x0112 = Orientation tag
            if exif_orientation:
                logger.info(f"classify-image: EXIF orientation tag = {exif_orientation}")
            else:
                logger.info("classify-image: No EXIF orientation tag found")
        except Exception:
            logger.info("classify-image: Could not read EXIF data")
        
        # Apply EXIF orientation (critical for mobile camera photos)
        # Mobile cameras store rotation in EXIF metadata that PIL doesn't auto-apply,
        # causing photos to appear rotated and misclassified as "Others"
        try:
            from PIL import ImageOps
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass
        
        # Convert to RGB if needed
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        logger.info(f"classify-image: after preprocessing {image.size[0]}x{image.size[1]} mode={image.mode}")
        
        # Create a small thumbnail for storage (base64)
        thumb = image.copy()
        thumb.thumbnail((200, 200))
        thumb_buffer = io.BytesIO()
        thumb.save(thumb_buffer, format="JPEG", quality=70)
        thumb_b64 = base64.b64encode(thumb_buffer.getvalue()).decode("utf-8")
        thumbnail_url = f"data:image/jpeg;base64,{thumb_b64}"
        
        # Run classification
        logger.info(f"classify-image: using model_version={model_version or 'default'}")
        result = await classify_chili_image(image, model_version=model_version)
        
        processing_time = (time.time() - start_time) * 1000
        
        if result["success"]:
            variety = result["variety"]
            confidence = result["confidence"]
            is_chili = result.get("is_chili", True)
            
            # If classified as "Others" (non-chili), return immediately without saving
            if not is_chili:
                return {
                    "success": True,
                    "is_chili": False,
                    "variety": "Others",
                    "confidence": confidence,
                    "predictions": result.get("predictions", []),
                    "raw_class": result.get("raw_class"),
                    "processing_time_ms": round(processing_time, 2),
                    "model": "roboflow",
                    "message": "The uploaded image does not appear to be a chili pepper. Please upload an image of a chili pepper for analysis.",
                }
            
            # ── Run maturity classification (variety-aware) ─────────────
            maturity_data = None
            shu_modifier = 1.0
            try:
                maturity_result = await maturity_classifier.classify(image, variety=variety)
                if maturity_result.get("success"):
                    shu_modifier = maturity_result.get("shu_modifier", 1.0)
                    maturity_data = {
                        "maturity_stage": maturity_result["maturity_stage"],
                        "maturity_class": maturity_result["maturity_class"],
                        "confidence": maturity_result["confidence"],
                        "predictions": maturity_result["predictions"],
                        "days_to_harvest": maturity_result["days_to_harvest"],
                        "spice_estimate": maturity_result["spice_estimate"],
                        "shu_modifier": shu_modifier,
                        "growth_advice": maturity_result["growth_advice"],
                        "description": maturity_result["description"],
                    }
                    logger.info(
                        f"Maturity: {maturity_result['maturity_stage']} "
                        f"({maturity_result['confidence']:.2%})"
                    )
                else:
                    logger.warning(f"Maturity classification failed: {maturity_result.get('error')}")
            except Exception as e:
                logger.error(f"Maturity classification error (non-fatal): {e}")
            
            # ── ML-based SHU prediction (A1: replaces hardcoded lookup) ───
            shu_predictor = get_shu_predictor()
            maturity_score = 0.5
            if maturity_data:
                stage = maturity_data.get("maturity_stage", "").lower()
                if "immature" in stage or "green" in stage:
                    maturity_score = 0.2
                elif "turning" in stage or "developing" in stage:
                    maturity_score = 0.5
                elif "overripe" in stage or "dried" in stage:
                    maturity_score = 0.95
                else:
                    maturity_score = 0.75  # mature/ripe
            
            ml_shu_result = shu_predictor.predict(
                model="ensemble",
                variety=variety,
                maturity_score=maturity_score,
                flower_stress_score=0.0,
            )
            
            predicted_shu = ml_shu_result.get("predicted_shu", 15000)
            # Clamp adjusted SHU to variety range
            from app.ml.shu_predictor import VARIETY_SHU_RANGES
            shu_min, shu_max = VARIETY_SHU_RANGES.get(variety, (0, 500000))
            adjusted_shu = int(predicted_shu * shu_modifier)
            adjusted_shu = max(shu_min, min(shu_max, adjusted_shu))
            heat_category = ml_shu_result.get("heat_category", "Medium")
            
            # ── Capsaicin estimation (A3) ─────────────────────────────
            capsaicin_ug_per_g = adjusted_shu * 0.0625  # Todd conversion
            capsaicin_data = {
                "capsaicin_mg_per_g": round(capsaicin_ug_per_g / 1000, 4),
                "dihydrocapsaicin_mg_per_g": round(capsaicin_ug_per_g * 0.5 / 1000, 4),
                "total_capsaicinoids_mg_per_g": round(capsaicin_ug_per_g * 1.5 / 1000, 4),
                "conversion_method": "Todd et al. (1977) — 1 SHU ≈ 0.0625 µg/g",
                "note": "Estimated from ML-predicted SHU, not laboratory HPLC",
            }
            
            # ── ML model details for transparency (C3) ───────────────
            ml_details = {
                "model_used": ml_shu_result.get("model_used", "ensemble"),
                "model_r2": ml_shu_result.get("model_r2", 0),
                "model_mae": ml_shu_result.get("model_mae", 0),
                "linear_regression_shu": ml_shu_result.get("linear_regression_shu"),
                "random_forest_shu": ml_shu_result.get("random_forest_shu"),
                "prediction_interval": ml_shu_result.get("prediction_interval"),
                "features_used": {
                    "variety": variety,
                    "maturity_score": maturity_score,
                    "flower_stress_score": 0.0,
                },
            }
            
            analysis_id = str(uuid.uuid4())
            
            # Save to prediction_history collection
            history_doc = {
                "analysis_id": analysis_id,
                "user_id": current_user["user_id"],
                "scan_type": "classification",
                "variety": variety,
                "confidence": confidence,
                "heat_level": heat_category,
                "base_shu": predicted_shu,
                "shu": adjusted_shu,
                "adjusted_shu": adjusted_shu,
                "maturity": maturity_data["maturity_stage"] if maturity_data else "Mature",
                "maturity_data": maturity_data,
                "capsaicin": capsaicin_data,
                "ml_details": ml_details,
                "predictions": result.get("predictions", []),
                "raw_class": result.get("raw_class"),
                "thumbnail": thumbnail_url,
                "filename": file.filename,
                "processing_time_ms": round(processing_time, 2),
                "created_at": datetime.utcnow(),
            }
            
            history_collection = MongoDB.get_collection("prediction_history")
            await history_collection.insert_one(history_doc)
            
            return {
                "success": True,
                "is_chili": True,
                "analysis_id": analysis_id,
                "variety": variety,
                "confidence": confidence,
                "heat_level": heat_category,
                "base_shu": predicted_shu,
                "shu": adjusted_shu,
                "adjusted_shu": adjusted_shu,
                "maturity": maturity_data,
                "capsaicin": capsaicin_data,
                "ml_details": ml_details,
                "predictions": result.get("predictions", []),
                "raw_class": result.get("raw_class"),
                "processing_time_ms": round(processing_time, 2),
                "model": "ml_ensemble+roboflow"
            }
        else:
            return {
                "success": False,
                "error": result.get("error", "Classification failed"),
                "variety": None,
                "confidence": 0,
                "processing_time_ms": round(processing_time, 2)
            }
            
    except Exception as e:
        logger.error(f"Image classification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Classification error: {str(e)}"
        )


@router.post("/segment-image")
@limiter.limit("15/minute")
async def segment_image(
    request: Request,
    file: UploadFile = File(...),
    analysis_id: str = Query(None, description="Existing analysis_id to update instead of creating new entry"),
    current_user: dict = Depends(get_current_user)
):
    """
    Segment & classify chili pods using the chili segmentation model.
    
    Detects multiple chili pods in one image and classifies each as:
      - Siling Haba (siling-haba-pod)
      - Siling Labuyo (siling-labuyo-pod)
      - Siling Demonyo (siling-demonyo-pod)
    
    Returns per-pod measurements, variety info, and grouped summaries.
    """
    import time
    start_time = time.time()
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Apply EXIF orientation (mobile camera fix)
        try:
            from PIL import ImageOps
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass
        
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        result = await chili_segmenter.segment(image)
        processing_time = (time.time() - start_time) * 1000
        
        # Create thumbnail and save to history
        import base64
        thumb = image.copy()
        thumb.thumbnail((200, 200))
        thumb_buffer = io.BytesIO()
        thumb.save(thumb_buffer, format="JPEG", quality=70)
        thumb_b64 = base64.b64encode(thumb_buffer.getvalue()).decode("utf-8")
        thumbnail_url = f"data:image/jpeg;base64,{thumb_b64}"
        
        # Use existing analysis_id if provided, otherwise generate new
        if analysis_id:
            used_analysis_id = analysis_id
        else:
            used_analysis_id = str(uuid.uuid4())
        
        # Determine primary variety from segments
        segments = result.get("segments", [])
        primary_variety = "Unknown"
        primary_confidence = 0.0
        if segments:
            primary_variety = segments[0].get("variety", "Unknown")
            primary_confidence = segments[0].get("confidence", 0.0)
        
        # ── ML-based SHU prediction (uses segmentation measurements) ──
        seg_shu_predictor = get_shu_predictor()
        seg_pod_length = 50.0
        seg_pod_width = 10.0
        seg_pod_weight = 5.0
        seg_measurements = result.get("measurements")
        if seg_measurements:
            avg = seg_measurements.get("average", {})
            if avg.get("length_mm"):
                seg_pod_length = avg["length_mm"]
            if avg.get("width_mm"):
                seg_pod_width = avg["width_mm"]
            if avg.get("estimated_weight_g"):
                seg_pod_weight = avg["estimated_weight_g"]
        
        seg_ml_result = seg_shu_predictor.predict(
            model="ensemble",
            variety=primary_variety,
            pod_length_mm=seg_pod_length,
            pod_width_mm=seg_pod_width,
            pod_weight_g=seg_pod_weight,
            maturity_score=0.75,
        )
        seg_predicted_shu = seg_ml_result.get("predicted_shu", 15000)
        seg_heat_category = seg_ml_result.get("heat_category", "Medium")
        
        seg_capsaicin_ug = seg_predicted_shu * 0.0625
        seg_capsaicin_data = {
            "capsaicin_mg_per_g": round(seg_capsaicin_ug / 1000, 4),
            "dihydrocapsaicin_mg_per_g": round(seg_capsaicin_ug * 0.5 / 1000, 4),
            "total_capsaicinoids_mg_per_g": round(seg_capsaicin_ug * 1.5 / 1000, 4),
            "conversion_method": "Todd et al. (1977)",
        }
        
        history_doc = {
            "analysis_id": used_analysis_id,
            "user_id": current_user["user_id"],
            "scan_type": "chili_segmentation",
            "variety": primary_variety,
            "confidence": primary_confidence,
            "heat_level": seg_heat_category,
            "shu": seg_predicted_shu,
            "maturity": "Mature",
            "total_detected": result.get("total_detected", 0),
            "segments": segments,
            "varieties_detected": result.get("varieties_detected", {}),
            "measurements": result.get("measurements"),
            "capsaicin": seg_capsaicin_data,
            "thumbnail": thumbnail_url,
            "filename": file.filename,
            "processing_time_ms": round(processing_time, 2),
            "created_at": datetime.utcnow(),
        }
        
        history_collection = MongoDB.get_collection("prediction_history")
        
        if analysis_id:
            # Update existing entry — merge segmentation data into the original record
            update_fields = {
                "segmentation_data": {
                    "scan_type": "chili_segmentation",
                    "total_detected": result.get("total_detected", 0),
                    "segments": segments,
                    "varieties_detected": result.get("varieties_detected", {}),
                    "measurements": result.get("measurements"),
                    "capsaicin": seg_capsaicin_data,
                    "shu": seg_predicted_shu,
                    "heat_level": seg_heat_category,
                    "processing_time_ms": round(processing_time, 2),
                },
                "total_detected": result.get("total_detected", 0),
                "segments": segments,
                "varieties_detected": result.get("varieties_detected", {}),
                "measurements": result.get("measurements"),
                "capsaicin": seg_capsaicin_data,
                "segmentation_thumbnail": thumbnail_url,
                "segmentation_at": datetime.utcnow(),
            }
            await history_collection.update_one(
                {"analysis_id": analysis_id, "user_id": current_user["user_id"]},
                {"$set": update_fields},
            )
        else:
            # No existing analysis — create new entry
            await history_collection.insert_one(history_doc)
        
        return {
            **result,
            "analysis_id": used_analysis_id,
            "shu": seg_predicted_shu,
            "heat_level": seg_heat_category,
            "capsaicin": seg_capsaicin_data,
            "processing_time_ms": round(processing_time, 2),
            "model": f"ml_ensemble+{chili_segmenter.project_id}/{chili_segmenter.model_version}",
        }
        
    except Exception as e:
        logger.error(f"Chili segmentation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Segmentation error: {str(e)}"
        )


@router.post("/segment-flower")
@limiter.limit("15/minute")
async def segment_flower(
    request: Request,
    file: UploadFile = File(...),
    analysis_id: str = Query(None, description="Existing analysis_id to update instead of creating new entry"),
    current_user: dict = Depends(get_current_user)
):
    """
    Legacy flower segmentation using flower-segmentation-brl0m/5.
    Detects flower/pod regions without variety classification.
    """
    import time
    start_time = time.time()
    
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
    
    try:
        import asyncio
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Apply EXIF orientation (mobile camera fix)
        try:
            from PIL import ImageOps
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass
        
        if image.mode != "RGB":
            image = image.convert("RGB")
        
        # Run flower segmentation and flower stress classification in parallel
        async def _no_stress():
            return {"success": False, "error": "Not configured"}

        seg_task = roboflow_segmenter.segment(image)
        stress_task = flower_stress_classifier.classify(image) if flower_stress_classifier.is_configured else _no_stress()
        result, stress_result = await asyncio.gather(seg_task, stress_task)
        processing_time = (time.time() - start_time) * 1000
        
        # Create thumbnail and save to history
        import base64
        thumb = image.copy()
        thumb.thumbnail((200, 200))
        thumb_buffer = io.BytesIO()
        thumb.save(thumb_buffer, format="JPEG", quality=70)
        thumb_b64 = base64.b64encode(thumb_buffer.getvalue()).decode("utf-8")
        thumbnail_url = f"data:image/jpeg;base64,{thumb_b64}"
        
        # Use existing analysis_id if provided, otherwise generate new
        if analysis_id:
            used_analysis_id = analysis_id
        else:
            used_analysis_id = str(uuid.uuid4())
        
        segments = result.get("segments", [])
        
        # Build flower stress data for the response
        flower_stress_data = None
        if stress_result.get("success"):
            flower_stress_data = {
                "stress_class": stress_result.get("stress_class"),
                "stress_score": stress_result.get("stress_score", 0),
                "confidence": stress_result.get("confidence", 0),
                "capsaicin_impact": stress_result.get("capsaicin_impact", ""),
                "shu_multiplier": stress_result.get("shu_multiplier", 1.0),
                "predictions": stress_result.get("predictions", []),
            }
        
        # ── Flower → Heat estimation (A2: core thesis pipeline) ──
        flower_heat_estimation = None
        if flower_stress_data:
            stress_score = flower_stress_data.get("stress_score", 0)
            shu_multiplier = flower_stress_data.get("shu_multiplier", 1.0)
            flower_heat_estimation = {
                "stress_adjusted_estimates": {
                    "Siling Haba": {
                        "base_shu_range": [500, 15000],
                        "stress_adjusted_shu": [round(500 * shu_multiplier), round(15000 * shu_multiplier)],
                        "capsaicin_mg_per_g": round(15000 * shu_multiplier * 0.0625 / 1000, 4),
                    },
                    "Siling Labuyo": {
                        "base_shu_range": [80000, 100000],
                        "stress_adjusted_shu": [round(80000 * shu_multiplier), round(100000 * shu_multiplier)],
                        "capsaicin_mg_per_g": round(100000 * shu_multiplier * 0.0625 / 1000, 4),
                    },
                    "Siling Demonyo": {
                        "base_shu_range": [100000, 225000],
                        "stress_adjusted_shu": [round(100000 * shu_multiplier), round(225000 * shu_multiplier)],
                        "capsaicin_mg_per_g": round(225000 * shu_multiplier * 0.0625 / 1000, 4),
                    },
                },
                "stress_score": stress_score,
                "shu_multiplier": shu_multiplier,
                "interpretation": (
                    f"Based on detected flower stress ({stress_score:.0%}), "
                    f"fruits are estimated to have {shu_multiplier:.2f}x "
                    f"{'increased' if shu_multiplier > 1 else 'baseline'} capsaicin "
                    f"production due to the capsaicin defense response."
                ),
            }
        
        history_doc = {
            "analysis_id": used_analysis_id,
            "user_id": current_user["user_id"],
            "scan_type": "flower_segmentation",
            "variety": "Flower Scan",
            "confidence": segments[0].get("confidence", 0.0) if segments else 0.0,
            "heat_level": "N/A",
            "shu": 0,
            "maturity": "N/A",
            "total_detected": result.get("total_detected", 0),
            "segments": segments,
            "measurements": result.get("measurements"),
            "flower_stress": flower_stress_data,
            "flower_heat_estimation": flower_heat_estimation,
            "thumbnail": thumbnail_url,
            "filename": file.filename,
            "processing_time_ms": round(processing_time, 2),
            "created_at": datetime.utcnow(),
        }
        
        history_collection = MongoDB.get_collection("prediction_history")
        
        if analysis_id:
            # Update existing entry — merge flower scan data into the original record
            # Also update SHU using flower stress multiplier
            original = await history_collection.find_one(
                {"analysis_id": analysis_id, "user_id": current_user["user_id"]}
            )
            update_fields = {
                "flower_scan_data": {
                    "scan_type": "flower_segmentation",
                    "total_detected": result.get("total_detected", 0),
                    "segments": segments,
                    "measurements": result.get("measurements"),
                    "flower_stress": flower_stress_data,
                    "flower_heat_estimation": flower_heat_estimation,
                    "processing_time_ms": round(processing_time, 2),
                },
                "flower_stress": flower_stress_data,
                "flower_heat_estimation": flower_heat_estimation,
                "flower_scan_thumbnail": thumbnail_url,
                "flower_scan_at": datetime.utcnow(),
            }
            # If we have stress data and an original record, adjust SHU
            if flower_stress_data and original:
                original_shu = original.get("adjusted_shu", 0) or original.get("shu", 0)
                original_variety = original.get("variety", "Unknown")
                shu_multiplier = flower_stress_data.get("shu_multiplier", 1.0)
                adjusted_shu = int(original_shu * shu_multiplier)
                # Clamp to variety range
                from app.ml.shu_predictor import VARIETY_SHU_RANGES
                shu_min, shu_max = VARIETY_SHU_RANGES.get(original_variety, (0, 500000))
                adjusted_shu = max(shu_min, min(shu_max, adjusted_shu))
                # Capsaicin from adjusted SHU
                cap_ug = adjusted_shu * 0.0625
                adjusted_capsaicin = {
                    "capsaicin_mg_per_g": round(cap_ug / 1000, 4),
                    "dihydrocapsaicin_mg_per_g": round(cap_ug * 0.5 / 1000, 4),
                    "total_capsaicinoids_mg_per_g": round(cap_ug * 1.5 / 1000, 4),
                    "conversion_method": "Todd et al. (1977)",
                    "note": "Refined with flower stress multiplier",
                }
                update_fields["original_shu"] = original_shu
                update_fields["shu"] = adjusted_shu
                update_fields["adjusted_shu"] = adjusted_shu
                update_fields["capsaicin"] = adjusted_capsaicin
                update_fields["flower_refined"] = True
                logger.info(
                    f"Flower scan SHU update for {analysis_id}: "
                    f"{original_shu} × {shu_multiplier:.2f} = {adjusted_shu}"
                )
            await history_collection.update_one(
                {"analysis_id": analysis_id, "user_id": current_user["user_id"]},
                {"$set": update_fields},
            )
        else:
            # No existing analysis — create new entry
            await history_collection.insert_one(history_doc)
        
        # Build response with updated SHU if available
        response_data = {
            **result,
            "analysis_id": used_analysis_id,
            "flower_stress": flower_stress_data,
            "flower_heat_estimation": flower_heat_estimation,
            "processing_time_ms": round(processing_time, 2),
            "model": f"{roboflow_segmenter.project_id}/{roboflow_segmenter.model_version}",
        }
        # Include updated SHU in response if flower stress adjusted it
        if analysis_id and flower_stress_data and 'adjusted_shu' in update_fields:
            response_data["shu"] = update_fields["adjusted_shu"]
            response_data["adjusted_shu"] = update_fields["adjusted_shu"]
            response_data["original_shu"] = update_fields.get("original_shu", 0)
            response_data["shu_multiplier"] = flower_stress_data.get("shu_multiplier", 1.0)
            response_data["capsaicin"] = update_fields.get("capsaicin")
        
        return response_data
        
    except Exception as e:
        logger.error(f"Flower segmentation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Flower segmentation error: {str(e)}"
        )


@router.post("/refine-with-flower")
async def refine_with_flower(
    analysis_id: str = Query(..., description="The analysis_id of the chili scan to refine"),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Step 2 of the chili scanner: upload a flower image from the same plant
    to refine the SHU prediction using flower stress as a multiplier.
    
    The flower stress score modifies the original SHU prediction, strengthening
    the accuracy of the spiciness estimate based on the capsaicin defense response
    hypothesis (paper core thesis).
    """
    import time
    start = time.time()
    
    try:
        # 1. Load the original analysis
        history_collection = MongoDB.get_collection("prediction_history")
        original = await history_collection.find_one({
            "analysis_id": analysis_id,
            "user_id": current_user["user_id"],
        })
        
        if not original:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Analysis {analysis_id} not found"
            )
        
        # 2. Process the flower image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Run flower segmentation + stress classification
        from app.services.roboflow_service import roboflow_segmenter, flower_stress_classifier
        
        flower_result = await roboflow_segmenter.segment(image)
        
        flower_stress_data = None
        if flower_result.get("success"):
            try:
                stress_result = await flower_stress_classifier.classify(image)
                if stress_result.get("success"):
                    flower_stress_data = {
                        "stress_class": stress_result.get("stress_class", ""),
                        "stress_score": stress_result.get("stress_score", 0),
                        "confidence": stress_result.get("confidence", 0),
                        "capsaicin_impact": stress_result.get("capsaicin_impact", ""),
                        "shu_multiplier": stress_result.get("shu_multiplier", 1.0),
                        "predictions": stress_result.get("predictions", []),
                    }
            except Exception as e:
                logger.warning(f"Flower stress classification failed: {e}")
        
        if not flower_stress_data:
            # Could not get stress data — still return what we have
            processing_time = (time.time() - start) * 1000
            return {
                "success": False,
                "error": "Could not classify flower stress from the uploaded image",
                "analysis_id": analysis_id,
                "processing_time_ms": round(processing_time, 2),
            }
        
        # 3. Compute refined SHU
        shu_multiplier = flower_stress_data["shu_multiplier"]
        original_shu = original.get("shu", 0) or original.get("adjusted_shu", 0)
        original_variety = original.get("variety", "Unknown")
        
        # Re-predict SHU with flower stress score included
        shu_predictor = get_shu_predictor()
        refined_result = shu_predictor.predict(
            model="ensemble",
            variety=original_variety,
            maturity_score=0.75,
            flower_stress_score=flower_stress_data["stress_score"],
        )
        
        refined_shu = refined_result.get("predicted_shu", original_shu)
        # Clamp refined SHU to variety range
        from app.ml.shu_predictor import VARIETY_SHU_RANGES
        shu_min, shu_max = VARIETY_SHU_RANGES.get(original_variety, (0, 500000))
        refined_shu = max(shu_min, min(shu_max, refined_shu))
        # Also apply the multiplier to the original adjusted SHU
        flower_adjusted_shu = int(original_shu * shu_multiplier)
        flower_adjusted_shu = max(shu_min, min(shu_max, flower_adjusted_shu))
        
        # Capsaicin from refined SHU
        capsaicin_ug = flower_adjusted_shu * 0.0625
        refined_capsaicin = {
            "capsaicin_mg_per_g": round(capsaicin_ug / 1000, 4),
            "dihydrocapsaicin_mg_per_g": round(capsaicin_ug * 0.5 / 1000, 4),
            "total_capsaicinoids_mg_per_g": round(capsaicin_ug * 1.5 / 1000, 4),
            "conversion_method": "Todd et al. (1977)",
            "note": "Refined with flower stress multiplier",
        }
        
        heat_category = refined_result.get("heat_category", original.get("heat_level", "Medium"))
        
        # 4. Update the original history record
        update_fields = {
            "flower_stress": flower_stress_data,
            "flower_refined": True,
            "original_shu": original_shu,
            "shu": flower_adjusted_shu,
            "adjusted_shu": flower_adjusted_shu,
            "heat_level": heat_category,
            "capsaicin": refined_capsaicin,
            "flower_scan_filename": file.filename,
            "flower_refined_at": datetime.utcnow(),
            "ml_details": {
                **(original.get("ml_details") or {}),
                "flower_stress_score": flower_stress_data["stress_score"],
                "shu_multiplier": shu_multiplier,
                "refined_shu": refined_shu,
                "flower_adjusted_shu": flower_adjusted_shu,
            },
        }
        
        await history_collection.update_one(
            {"analysis_id": analysis_id, "user_id": current_user["user_id"]},
            {"$set": update_fields},
        )
        
        processing_time = (time.time() - start) * 1000
        
        logger.info(
            f"Flower refinement for {analysis_id}: "
            f"original={original_shu} → refined={refined_shu} → "
            f"flower_adjusted={flower_adjusted_shu} (×{shu_multiplier:.2f})"
        )
        
        return {
            "success": True,
            "analysis_id": analysis_id,
            "variety": original_variety,
            "original_shu": original_shu,
            "refined_shu": refined_shu,
            "flower_adjusted_shu": flower_adjusted_shu,
            "heat_level": heat_category,
            "shu_multiplier": shu_multiplier,
            "flower_stress": flower_stress_data,
            "capsaicin": refined_capsaicin,
            "flower_segments": flower_result.get("total_detected", 0),
            "processing_time_ms": round(processing_time, 2),
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Flower refinement error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Flower refinement error: {str(e)}"
        )


@router.get("/roboflow-status")
async def get_roboflow_status(
    current_user: dict = Depends(get_current_user)
):
    """
    Check if Roboflow models are configured and ready.
    """
    return {
        "configured": roboflow_classifier.is_configured,
        "project_id": roboflow_classifier.project_id if roboflow_classifier.is_configured else None,
        "model_version": roboflow_classifier.model_version if roboflow_classifier.is_configured else None,
        "use_hosted": roboflow_classifier.use_hosted,
        "chili_segmentation": {
            "configured": chili_segmenter.is_configured,
            "project_id": chili_segmenter.project_id if chili_segmenter.is_configured else None,
            "model_version": chili_segmenter.model_version if chili_segmenter.is_configured else None,
        },
        "flower_segmentation": {
            "configured": roboflow_segmenter.is_configured,
            "project_id": roboflow_segmenter.project_id if roboflow_segmenter.is_configured else None,
            "model_version": roboflow_segmenter.model_version if roboflow_segmenter.is_configured else None,
        },
        "maturity_classifier": {
            "configured": maturity_classifier.is_configured,
            "project_id": maturity_classifier.project_id if maturity_classifier.is_configured else None,
            "model_version": maturity_classifier.model_version if maturity_classifier.is_configured else None,
        }
    }
