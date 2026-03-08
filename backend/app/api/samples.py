"""
Chili Samples Routes
====================

Endpoints for managing chili sample records.
"""

from typing import Optional, List
from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.core.database import MongoDB, Collections
from app.core.security import get_current_user
from app.schemas.sample import (
    ChiliSampleCreate,
    ChiliSampleResponse,
    ChiliSampleUpdate,
    ChiliSampleSummary,
    SampleListResponse,
    ChiliVariety,
    HeatCategory,
)

router = APIRouter()


@router.post("/", response_model=ChiliSampleResponse, status_code=status.HTTP_201_CREATED)
async def create_sample(
    sample_data: ChiliSampleCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a new chili sample record.
    
    This creates an empty sample that can be updated with images and predictions.
    """
    collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    sample_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    sample_doc = {
        "sample_id": sample_id,
        "user_id": current_user["user_id"],
        "variety": sample_data.variety.value if sample_data.variety else None,
        "images": [],
        "flower_morphology": None,
        "pod_morphology": None,
        "plant_characteristics": None,
        "predictions": None,
        "model_metadata": None,
        "actual_data": None,
        "notes": sample_data.notes,
        "tags": sample_data.tags or [],
        "is_public": sample_data.is_public,
        "created_at": now,
        "updated_at": None
    }
    
    await collection.insert_one(sample_doc)
    
    return ChiliSampleResponse(
        sample_id=sample_id,
        user_id=current_user["user_id"],
        variety=sample_data.variety,
        images=[],
        notes=sample_data.notes,
        tags=sample_data.tags or [],
        is_public=sample_data.is_public,
        created_at=now
    )


@router.get("/", response_model=SampleListResponse)
async def list_samples(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    variety: Optional[ChiliVariety] = None,
    heat_category: Optional[HeatCategory] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    List user's chili samples with filtering and pagination.
    """
    collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    # Build query
    query = {"user_id": current_user["user_id"]}
    
    if variety:
        query["$or"] = [
            {"variety": variety.value},
            {"predictions.variety_classification.predicted_variety": variety.value}
        ]
    
    if heat_category:
        query["predictions.heat_level.heat_category"] = heat_category.value
    
    if search:
        query["$or"] = [
            {"notes": {"$regex": search, "$options": "i"}},
            {"tags": {"$in": [search]}}
        ]
    
    # Get total count
    total = await collection.count_documents(query)
    
    # Calculate pagination
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size
    
    # Fetch samples
    cursor = collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)
    samples = await cursor.to_list(length=page_size)
    
    # Build response
    sample_summaries = []
    for sample in samples:
        predictions = sample.get("predictions", {})
        variety_pred = predictions.get("variety_classification", {}) if predictions else {}
        heat_pred = predictions.get("heat_level", {}) if predictions else {}
        
        # Get thumbnail from first image
        images = sample.get("images", [])
        thumbnail = images[0].get("thumbnail_url") if images else None
        
        sample_summaries.append(ChiliSampleSummary(
            sample_id=sample["sample_id"],
            variety=sample.get("variety"),
            predicted_variety=variety_pred.get("predicted_variety"),
            predicted_shu=heat_pred.get("predicted_shu"),
            heat_category=heat_pred.get("heat_category"),
            thumbnail_url=thumbnail,
            created_at=sample["created_at"]
        ))
    
    return SampleListResponse(
        samples=sample_summaries,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{sample_id}", response_model=ChiliSampleResponse)
async def get_sample(
    sample_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific chili sample by ID."""
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
    
    return ChiliSampleResponse(
        sample_id=sample["sample_id"],
        user_id=sample["user_id"],
        variety=sample.get("variety"),
        images=sample.get("images", []),
        flower_morphology=sample.get("flower_morphology"),
        pod_morphology=sample.get("pod_morphology"),
        plant_characteristics=sample.get("plant_characteristics"),
        predictions=sample.get("predictions"),
        model_metadata=sample.get("model_metadata"),
        actual_data=sample.get("actual_data"),
        notes=sample.get("notes"),
        tags=sample.get("tags", []),
        is_public=sample.get("is_public", False),
        created_at=sample["created_at"],
        updated_at=sample.get("updated_at")
    )


@router.put("/{sample_id}", response_model=ChiliSampleResponse)
async def update_sample(
    sample_id: str,
    update_data: ChiliSampleUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a chili sample."""
    collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    # Check ownership
    sample = await collection.find_one({
        "sample_id": sample_id,
        "user_id": current_user["user_id"]
    })
    
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample not found"
        )
    
    # Build update document
    update_doc = {"updated_at": datetime.utcnow()}
    
    if update_data.variety is not None:
        update_doc["variety"] = update_data.variety.value
    if update_data.notes is not None:
        update_doc["notes"] = update_data.notes
    if update_data.tags is not None:
        update_doc["tags"] = update_data.tags
    if update_data.is_public is not None:
        update_doc["is_public"] = update_data.is_public
    if update_data.actual_data is not None:
        update_doc["actual_data"] = update_data.actual_data.model_dump()
    
    await collection.update_one(
        {"sample_id": sample_id},
        {"$set": update_doc}
    )
    
    # Return updated sample
    updated_sample = await collection.find_one({"sample_id": sample_id})
    
    return ChiliSampleResponse(
        sample_id=updated_sample["sample_id"],
        user_id=updated_sample["user_id"],
        variety=updated_sample.get("variety"),
        images=updated_sample.get("images", []),
        flower_morphology=updated_sample.get("flower_morphology"),
        pod_morphology=updated_sample.get("pod_morphology"),
        plant_characteristics=updated_sample.get("plant_characteristics"),
        predictions=updated_sample.get("predictions"),
        model_metadata=updated_sample.get("model_metadata"),
        actual_data=updated_sample.get("actual_data"),
        notes=updated_sample.get("notes"),
        tags=updated_sample.get("tags", []),
        is_public=updated_sample.get("is_public", False),
        created_at=updated_sample["created_at"],
        updated_at=updated_sample.get("updated_at")
    )


@router.delete("/{sample_id}")
async def delete_sample(
    sample_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a chili sample."""
    collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    result = await collection.delete_one({
        "sample_id": sample_id,
        "user_id": current_user["user_id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample not found"
        )
    
    # TODO: Also delete associated images from storage
    
    return {"message": "Sample deleted successfully"}


@router.get("/public/feed", response_model=SampleListResponse)
async def get_public_samples(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    variety: Optional[ChiliVariety] = None
):
    """Get public samples feed (no auth required)."""
    collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    query = {"is_public": True}
    
    if variety:
        query["variety"] = variety.value
    
    total = await collection.count_documents(query)
    skip = (page - 1) * page_size
    total_pages = (total + page_size - 1) // page_size
    
    cursor = collection.find(query).sort("created_at", -1).skip(skip).limit(page_size)
    samples = await cursor.to_list(length=page_size)
    
    sample_summaries = []
    for sample in samples:
        predictions = sample.get("predictions", {})
        variety_pred = predictions.get("variety_classification", {}) if predictions else {}
        heat_pred = predictions.get("heat_level", {}) if predictions else {}
        images = sample.get("images", [])
        thumbnail = images[0].get("thumbnail_url") if images else None
        
        sample_summaries.append(ChiliSampleSummary(
            sample_id=sample["sample_id"],
            variety=sample.get("variety"),
            predicted_variety=variety_pred.get("predicted_variety"),
            predicted_shu=heat_pred.get("predicted_shu"),
            heat_category=heat_pred.get("heat_category"),
            thumbnail_url=thumbnail,
            created_at=sample["created_at"]
        ))
    
    return SampleListResponse(
        samples=sample_summaries,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )
