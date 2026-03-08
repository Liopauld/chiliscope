"""
Cloudinary Image Upload Service
================================

Handles image uploads, transformations, and deletions using Cloudinary.
"""

import cloudinary
import cloudinary.uploader
from typing import Optional, Dict, Any
from fastapi import UploadFile, HTTPException
import io

from .config import settings


# Initialize Cloudinary
cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True
)


class CloudinaryService:
    """Service for handling Cloudinary image operations."""
    
    @staticmethod
    async def upload_image(
        file: UploadFile,
        folder: Optional[str] = None,
        public_id: Optional[str] = None,
        tags: Optional[list] = None,
        transformation: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Upload an image to Cloudinary.
        
        Args:
            file: The uploaded file
            folder: Cloudinary folder (defaults to settings.cloudinary_folder)
            public_id: Custom public ID for the image
            tags: List of tags for the image
            transformation: Cloudinary transformation options
            
        Returns:
            Dict containing url, public_id, width, height, format
            
        Raises:
            HTTPException: If upload fails
        """
        if not settings.cloudinary_cloud_name:
            raise HTTPException(
                status_code=500,
                detail="Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables."
            )
        
        # Validate file type
        allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/jfif"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed types: {', '.join(allowed_types)}"
            )
        
        # Read file content
        try:
            contents = await file.read()
            
            # Prepare upload options
            upload_options = {
                "folder": folder or settings.cloudinary_folder,
                "resource_type": "image",
                "overwrite": False,
            }
            
            if public_id:
                upload_options["public_id"] = public_id
            
            if tags:
                upload_options["tags"] = tags
            
            if transformation:
                upload_options["transformation"] = transformation
            else:
                # Default transformation: limit size to 2000px max, optimize quality
                upload_options["transformation"] = [
                    {"width": 2000, "height": 2000, "crop": "limit"},
                    {"quality": "auto:good"},
                    {"fetch_format": "auto"}
                ]
            
            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                io.BytesIO(contents),
                **upload_options
            )
            
            return {
                "url": result.get("secure_url"),
                "public_id": result.get("public_id"),
                "width": result.get("width"),
                "height": result.get("height"),
                "format": result.get("format"),
                "bytes": result.get("bytes"),
                "created_at": result.get("created_at")
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload image: {str(e)}"
            )
        finally:
            await file.seek(0)  # Reset file pointer
    
    @staticmethod
    def delete_image(public_id: str) -> bool:
        """
        Delete an image from Cloudinary.
        
        Args:
            public_id: The public ID of the image to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        try:
            result = cloudinary.uploader.destroy(public_id)
            return result.get("result") == "ok"
        except Exception:
            return False
    
    @staticmethod
    def get_optimized_url(
        public_id: str,
        width: Optional[int] = None,
        height: Optional[int] = None,
        crop: str = "fill",
        quality: str = "auto:good",
        format: str = "auto"
    ) -> str:
        """
        Generate an optimized URL for an image.
        
        Args:
            public_id: The public ID of the image
            width: Target width
            height: Target height
            crop: Crop mode (fill, fit, limit, etc.)
            quality: Quality setting (auto:good, auto:best, etc.)
            format: Format (auto, jpg, png, webp, etc.)
            
        Returns:
            Optimized image URL
        """
        transformation = {
            "quality": quality,
            "fetch_format": format
        }
        
        if width or height:
            transformation.update({
                "width": width,
                "height": height,
                "crop": crop
            })
        
        return cloudinary.CloudinaryImage(public_id).build_url(**transformation)


# Create global instance
cloudinary_service = CloudinaryService()
