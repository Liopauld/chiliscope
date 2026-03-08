"""
ML Models API Router
====================

Dedicated endpoints for the trained ML models:
  - SHU prediction (Linear Regression / Random Forest / Ensemble)
  - Maturity prediction (Decision Tree)
  - Model comparison / metadata
  - Flower stress classification (Roboflow)
"""

import json
import os
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from PIL import Image
import io

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Request / Response schemas ──────────────────────────────────────

class SHUPredictionRequest(BaseModel):
    variety: str = Field("Siling Labuyo", description="Chili variety")
    length_cm: float = Field(5.0, ge=0.5, le=30)
    width_cm: float = Field(1.0, ge=0.2, le=8)
    weight_g: float = Field(5.0, ge=0.5, le=100)
    wall_thickness_mm: float = Field(1.5, ge=0.3, le=8)
    color_r: int = Field(200, ge=0, le=255)
    color_g: int = Field(50, ge=0, le=255)
    color_b: int = Field(30, ge=0, le=255)
    days_to_maturity: float = Field(65, ge=20, le=150)
    moisture_content: float = Field(0.85, ge=0, le=1)
    seed_count: int = Field(30, ge=0, le=200)
    placenta_ratio: float = Field(0.3, ge=0, le=1)
    flower_stress_score: float = Field(0.0, ge=0, le=1)
    model: str = Field("ensemble", description="Model: linear_regression | random_forest | ensemble")


class MaturityPredictionRequest(BaseModel):
    variety: str = Field("Siling Labuyo")
    color_r: int = Field(180, ge=0, le=255)
    color_g: int = Field(50, ge=0, le=255)
    color_b: int = Field(30, ge=0, le=255)
    hue: float = Field(15.0, ge=0, le=180)
    saturation: float = Field(200.0, ge=0, le=255)
    value_hsv: float = Field(180.0, ge=0, le=255)
    days_to_maturity: float = Field(65, ge=20, le=150)


# ── SHU Prediction ─────────────────────────────────────────────────

@router.post("/predict-shu")
async def predict_shu(req: SHUPredictionRequest):
    """Predict Scoville Heat Units using trained models."""
    from ..ml.shu_predictor import get_shu_predictor

    predictor = get_shu_predictor()
    result = predictor.predict(
        variety=req.variety,
        length_cm=req.length_cm,
        width_cm=req.width_cm,
        weight_g=req.weight_g,
        wall_thickness_mm=req.wall_thickness_mm,
        color_r=req.color_r,
        color_g=req.color_g,
        color_b=req.color_b,
        days_to_maturity=req.days_to_maturity,
        moisture_content=req.moisture_content,
        seed_count=req.seed_count,
        placenta_ratio=req.placenta_ratio,
        flower_stress_score=req.flower_stress_score,
        model=req.model,
    )
    return result


@router.post("/predict-shu/compare")
async def compare_shu_models(req: SHUPredictionRequest):
    """Run ALL three models and return comparison."""
    from ..ml.shu_predictor import get_shu_predictor

    predictor = get_shu_predictor()
    results = {}
    for model_name in ["linear_regression", "random_forest", "ensemble"]:
        results[model_name] = predictor.predict(
            variety=req.variety,
            length_cm=req.length_cm,
            width_cm=req.width_cm,
            weight_g=req.weight_g,
            wall_thickness_mm=req.wall_thickness_mm,
            color_r=req.color_r,
            color_g=req.color_g,
            color_b=req.color_b,
            days_to_maturity=req.days_to_maturity,
            moisture_content=req.moisture_content,
            seed_count=req.seed_count,
            placenta_ratio=req.placenta_ratio,
            flower_stress_score=req.flower_stress_score,
            model=model_name,
        )

    return {
        "comparison": results,
        "best_model": min(results, key=lambda m: results[m].get("model_mae", float("inf"))),
    }


# ── Maturity Prediction ────────────────────────────────────────────

@router.post("/predict-maturity")
async def predict_maturity(req: MaturityPredictionRequest):
    """Predict maturity stage using trained Decision Tree."""
    from ..ml.maturity_predictor_trained import get_trained_maturity_predictor

    predictor = get_trained_maturity_predictor()
    result = predictor.predict(
        variety=req.variety,
        color_r=req.color_r,
        color_g=req.color_g,
        color_b=req.color_b,
        hue=req.hue,
        saturation=req.saturation,
        value_hsv=req.value_hsv,
        days_to_maturity=req.days_to_maturity,
    )
    return result


# ── Model Metadata / Comparison ─────────────────────────────────────

@router.get("/model-comparison")
async def get_model_comparison():
    """Return the stored comparative analysis from model training."""
    models_dir = os.path.join(os.path.dirname(__file__), "..", "ml", "models")
    analysis_path = os.path.join(models_dir, "comparative_analysis.json")

    if not os.path.exists(analysis_path):
        raise HTTPException(404, "No comparative analysis found. Train models first.")

    with open(analysis_path) as f:
        return json.load(f)


@router.get("/model-metadata/{model_name}")
async def get_model_metadata(model_name: str):
    """Get metadata for a specific trained model."""
    valid = {
        "linear_regression": "linear_regression_metadata.json",
        "random_forest": "random_forest_metadata.json",
        "decision_tree": "decision_tree_metadata.json",
    }
    if model_name not in valid:
        raise HTTPException(400, f"Unknown model. Choose from: {list(valid.keys())}")

    models_dir = os.path.join(os.path.dirname(__file__), "..", "ml", "models")
    path = os.path.join(models_dir, valid[model_name])

    if not os.path.exists(path):
        raise HTTPException(404, f"Model '{model_name}' metadata not found. Train first.")

    with open(path) as f:
        return json.load(f)


@router.get("/decision-tree-rules")
async def get_decision_tree_rules():
    """Get interpretable rules from the Decision Tree model."""
    models_dir = os.path.join(os.path.dirname(__file__), "..", "ml", "models")
    meta_path = os.path.join(models_dir, "decision_tree_metadata.json")

    if not os.path.exists(meta_path):
        raise HTTPException(404, "Decision Tree metadata not found. Train first.")

    with open(meta_path) as f:
        meta = json.load(f)

    return {
        "harvest_rules": meta.get("harvest_readiness_rules", meta.get("harvest_rules", [])),
        "feature_importances": meta.get("feature_importances", {}),
        "tree_depth": meta.get("tree_depth", 0),
        "n_leaves": meta.get("n_leaves", 0),
    }


# ── Flower Stress Classification ────────────────────────────────────

@router.post("/classify-flower-stress")
async def classify_flower_stress(file: UploadFile = File(...)):
    """
    Classify flower stress level from an uploaded image.
    Returns stress_score (0-1) and capsaicin impact assessment.
    """
    from ..services.roboflow_service import flower_stress_classifier

    if not flower_stress_classifier.is_configured:
        raise HTTPException(503, "Flower stress classifier not configured")

    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception:
        raise HTTPException(400, "Invalid image file")

    result = await flower_stress_classifier.classify(image)
    if not result.get("success"):
        raise HTTPException(502, result.get("error", "Flower stress classification failed"))

    return result


# ── Color Feature Extraction ────────────────────────────────────────

@router.post("/extract-color-features")
async def extract_color_features_endpoint(file: UploadFile = File(...)):
    """Extract color features from a chili image for model input."""
    from ..ml.color_extractor import extract_color_features

    contents = await file.read()
    try:
        Image.open(io.BytesIO(contents))  # validate
    except Exception:
        raise HTTPException(400, "Invalid image file")

    features = extract_color_features(image_bytes=contents)
    return features
