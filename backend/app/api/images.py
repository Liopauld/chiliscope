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
from app.core.cloudinary_service import CloudinaryService
from app.schemas.sample import SampleImage, ImageType, ImageMetadata

import os
import shutil
import logging

logger = logging.getLogger(__name__)

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
    Fallback when Cloudinary is not configured.
    """
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


async def save_image_to_cloudinary(
    file_content: bytes,
    filename: str,
    sample_id: str
) -> dict:
    """Upload image to Cloudinary with original, thumbnail, and processed variants."""
    import cloudinary.uploader

    file_ext = filename.rsplit(".", 1)[-1].lower()
    base_id = f"{settings.cloudinary_folder}/samples/{sample_id}/{uuid.uuid4()}"

    # Upload original
    result = cloudinary.uploader.upload(
        io.BytesIO(file_content),
        public_id=base_id,
        resource_type="image",
        transformation=[
            {"width": 2000, "height": 2000, "crop": "limit"},
            {"quality": "auto:good"},
            {"fetch_format": "auto"},
        ],
    )
    original_url = result["secure_url"]

    # Thumbnail URL via Cloudinary transformation
    thumbnail_url = cloudinary.utils.cloudinary_url(
        base_id,
        width=256, height=256, crop="fill", quality="auto", fetch_format="auto"
    )[0]

    # Processed URL (model input size)
    w, h = settings.image_size
    processed_url = cloudinary.utils.cloudinary_url(
        base_id,
        width=w, height=h, crop="fill", quality="auto", fetch_format="auto"
    )[0]

    return {
        "original_url": original_url,
        "processed_url": processed_url,
        "thumbnail_url": thumbnail_url,
        "cloudinary_public_id": result["public_id"],
    }


async def save_image(file_content: bytes, filename: str, sample_id: str) -> dict:
    """Save image using Cloudinary if configured, otherwise local storage."""
    if settings.cloudinary_cloud_name and settings.cloudinary_api_key:
        try:
            return await save_image_to_cloudinary(file_content, filename, sample_id)
        except Exception as e:
            logger.warning("Cloudinary upload failed, falling back to local: %s", e)
    return await save_image_locally(file_content, filename, sample_id)


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
    
    # Save image (Cloudinary if configured, otherwise local)
    image_urls = await save_image(file_content, file.filename, sample_id)
    
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
            
            image_urls = await save_image(file_content, file.filename, sample_id)
            
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
    
    # Fetch sample first to get image URLs for storage cleanup
    sample = await collection.find_one({
        "sample_id": sample_id,
        "user_id": current_user["user_id"]
    })
    
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
    
    # Delete actual files from storage
    if sample and "images" in sample:
        for img in sample["images"]:
            if img.get("image_id") == image_id:
                # Try Cloudinary deletion
                for url_key in ["original_url", "processed_url", "thumbnail_url"]:
                    url = img.get(url_key, "")
                    if "cloudinary" in url:
                        public_id = url.split("/upload/")[-1].rsplit(".", 1)[0] if "/upload/" in url else ""
                        if public_id:
                            CloudinaryService.delete_image(public_id)
                    elif url.startswith("/uploads/"):
                        local_path = url.lstrip("/")
                        if os.path.exists(local_path):
                            try:
                                os.remove(local_path)
                            except OSError:
                                logger.warning("Failed to delete local file: %s", local_path)
                break
    
    return {"message": "Image deleted successfully"}
