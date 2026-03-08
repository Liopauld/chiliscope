"""
Images Routes
=============

Endpoints for image upload and management.
"""

from typing import List, Optional
from datetime import datetime
import uuid
import io

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from PIL import Image

from app.core.config import settings
from app.core.database import MongoDB, Collections
from app.core.security import get_current_user
from app.schemas.sample import SampleImage, ImageType, ImageMetadata

router = APIRouter()


def validate_image(file: UploadFile) -> None:
    """Validate uploaded image file."""
    # Check file extension
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided"
        )
    
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed: {settings.allowed_extensions}"
        )
    
    # Check content type
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )


async def save_image_locally(
    file_content: bytes,
    filename: str,
    sample_id: str
) -> dict:
    """
    Save image to local storage.
    In production, replace with S3/Cloud Storage.
    """
    import os
    
    # Create uploads directory if not exists
    upload_dir = f"uploads/{sample_id}"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    file_ext = filename.rsplit(".", 1)[-1].lower()
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    
    # Save original
    original_path = f"{upload_dir}/{unique_filename}"
    with open(original_path, "wb") as f:
        f.write(file_content)
    
    # Create thumbnail
    img = Image.open(io.BytesIO(file_content))
    img.thumbnail((256, 256))
    thumbnail_filename = f"thumb_{unique_filename}"
    thumbnail_path = f"{upload_dir}/{thumbnail_filename}"
    img.save(thumbnail_path)
    
    # Create processed version (resized to model input size)
    img = Image.open(io.BytesIO(file_content))
    img = img.resize(settings.image_size)
    processed_filename = f"processed_{unique_filename}"
    processed_path = f"{upload_dir}/{processed_filename}"
    img.save(processed_path)
    
    return {
        "original_url": f"/uploads/{sample_id}/{unique_filename}",
        "processed_url": f"/uploads/{sample_id}/{processed_filename}",
        "thumbnail_url": f"/uploads/{sample_id}/{thumbnail_filename}"
    }


@router.post("/upload/{sample_id}", response_model=SampleImage)
async def upload_image(
    sample_id: str,
    file: UploadFile = File(...),
    image_type: ImageType = Form(ImageType.FLOWER),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload an image for a chili sample.
    
    - **sample_id**: ID of the sample to attach image to
    - **file**: Image file (JPEG, PNG)
    - **image_type**: Type of image (flower, pod, plant)
    """
    # Validate image
    validate_image(file)
    
    # Check sample ownership
    samples_collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    sample = await samples_collection.find_one({
        "sample_id": sample_id,
        "user_id": current_user["user_id"]
    })
    
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample not found"
        )
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds {settings.max_file_size_mb}MB limit"
        )
    
    # Save image
    image_urls = await save_image_locally(file_content, file.filename, sample_id)
    
    # Create image document
    image_id = str(uuid.uuid4())
    image_doc = SampleImage(
        image_id=image_id,
        image_type=image_type,
        original_url=image_urls["original_url"],
        processed_url=image_urls["processed_url"],
        thumbnail_url=image_urls["thumbnail_url"],
        metadata=ImageMetadata(capture_date=datetime.utcnow())
    )
    
    # Update sample with new image
    await samples_collection.update_one(
        {"sample_id": sample_id},
        {
            "$push": {"images": image_doc.model_dump()},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    return image_doc


@router.post("/upload/{sample_id}/batch", response_model=List[SampleImage])
async def upload_multiple_images(
    sample_id: str,
    files: List[UploadFile] = File(...),
    image_type: ImageType = Form(ImageType.FLOWER),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload multiple images for a chili sample.
    
    - **sample_id**: ID of the sample to attach images to
    - **files**: Multiple image files
    - **image_type**: Type of images
    """
    if len(files) > 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 10 images per batch"
        )
    
    # Check sample ownership
    samples_collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    sample = await samples_collection.find_one({
        "sample_id": sample_id,
        "user_id": current_user["user_id"]
    })
    
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sample not found"
        )
    
    uploaded_images = []
    
    for file in files:
        try:
            validate_image(file)
            file_content = await file.read()
            
            if len(file_content) > settings.max_file_size_bytes:
                continue  # Skip oversized files
            
            image_urls = await save_image_locally(file_content, file.filename, sample_id)
            
            image_id = str(uuid.uuid4())
            image_doc = SampleImage(
                image_id=image_id,
                image_type=image_type,
                original_url=image_urls["original_url"],
                processed_url=image_urls["processed_url"],
                thumbnail_url=image_urls["thumbnail_url"],
                metadata=ImageMetadata(capture_date=datetime.utcnow())
            )
            
            uploaded_images.append(image_doc)
            
        except Exception as e:
            continue  # Skip failed uploads
    
    if uploaded_images:
        # Update sample with all new images
        await samples_collection.update_one(
            {"sample_id": sample_id},
            {
                "$push": {"images": {"$each": [img.model_dump() for img in uploaded_images]}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
    
    return uploaded_images


@router.get("/{sample_id}", response_model=List[SampleImage])
async def get_sample_images(
    sample_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all images for a sample."""
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
    
    return sample.get("images", [])


@router.delete("/{sample_id}/{image_id}")
async def delete_image(
    sample_id: str,
    image_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an image from a sample."""
    collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    result = await collection.update_one(
        {
            "sample_id": sample_id,
            "user_id": current_user["user_id"]
        },
        {
            "$pull": {"images": {"image_id": image_id}},
            "$set": {"updated_at": datetime.utcnow()}
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )
    
    # TODO: Delete actual files from storage
    
    return {"message": "Image deleted successfully"}
