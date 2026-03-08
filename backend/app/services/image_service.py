"""
Image Service
=============

Image upload, storage, and processing service.
"""

import os
import uuid
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ImageService:
    """
    Service for managing image uploads and storage.
    """
    
    def __init__(self, upload_dir: str = "uploads"):
        """
        Initialize image service.
        
        Args:
            upload_dir: Directory for storing uploaded images
        """
        self.upload_dir = Path(upload_dir)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Supported formats
        self.allowed_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        self.max_file_size = 10 * 1024 * 1024  # 10MB
    
    def generate_filename(self, original_filename: str, user_id: str) -> str:
        """
        Generate a unique filename for uploaded image.
        
        Args:
            original_filename: Original filename
            user_id: ID of uploading user
            
        Returns:
            Unique filename
        """
        ext = Path(original_filename).suffix.lower()
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        
        return f"{user_id}_{timestamp}_{unique_id}{ext}"
    
    def validate_image(self, filename: str, file_size: int) -> Dict:
        """
        Validate image file.
        
        Args:
            filename: Name of the file
            file_size: Size in bytes
            
        Returns:
            Validation result with is_valid and errors
        """
        errors = []
        
        ext = Path(filename).suffix.lower()
        if ext not in self.allowed_extensions:
            errors.append(f"Invalid format. Allowed: {', '.join(self.allowed_extensions)}")
        
        if file_size > self.max_file_size:
            max_mb = self.max_file_size / (1024 * 1024)
            errors.append(f"File too large. Maximum size: {max_mb}MB")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def save_image(
        self,
        file_content: bytes,
        filename: str,
        user_id: str,
        subfolder: Optional[str] = None
    ) -> Dict:
        """
        Save uploaded image to disk.
        
        Args:
            file_content: Image bytes
            filename: Original filename
            user_id: User ID
            subfolder: Optional subfolder
            
        Returns:
            Save result with path and metadata
        """
        # Validate
        validation = self.validate_image(filename, len(file_content))
        if not validation["is_valid"]:
            return {
                "success": False,
                "errors": validation["errors"]
            }
        
        # Generate unique filename
        new_filename = self.generate_filename(filename, user_id)
        
        # Determine save path
        if subfolder:
            save_dir = self.upload_dir / subfolder
            save_dir.mkdir(parents=True, exist_ok=True)
        else:
            save_dir = self.upload_dir
        
        file_path = save_dir / new_filename
        
        # Save file
        try:
            with open(file_path, "wb") as f:
                f.write(file_content)
            
            logger.info(f"Image saved: {file_path}")
            
            return {
                "success": True,
                "filename": new_filename,
                "original_filename": filename,
                "path": str(file_path),
                "relative_path": str(file_path.relative_to(self.upload_dir)),
                "size": len(file_content),
                "saved_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to save image: {e}")
            return {
                "success": False,
                "errors": [str(e)]
            }
    
    def get_image_path(self, filename: str, subfolder: Optional[str] = None) -> Optional[Path]:
        """
        Get full path to an image.
        
        Args:
            filename: Image filename
            subfolder: Optional subfolder
            
        Returns:
            Path object if exists, None otherwise
        """
        if subfolder:
            path = self.upload_dir / subfolder / filename
        else:
            path = self.upload_dir / filename
        
        if path.exists():
            return path
        return None
    
    def delete_image(self, filename: str, subfolder: Optional[str] = None) -> bool:
        """
        Delete an image file.
        
        Args:
            filename: Image filename
            subfolder: Optional subfolder
            
        Returns:
            True if deleted, False otherwise
        """
        path = self.get_image_path(filename, subfolder)
        
        if path and path.exists():
            try:
                path.unlink()
                logger.info(f"Image deleted: {path}")
                return True
            except Exception as e:
                logger.error(f"Failed to delete image: {e}")
        
        return False
    
    def list_images(
        self,
        user_id: Optional[str] = None,
        subfolder: Optional[str] = None
    ) -> List[Dict]:
        """
        List images in directory.
        
        Args:
            user_id: Filter by user ID
            subfolder: Search in subfolder
            
        Returns:
            List of image metadata
        """
        search_dir = self.upload_dir / subfolder if subfolder else self.upload_dir
        
        if not search_dir.exists():
            return []
        
        images = []
        for file_path in search_dir.iterdir():
            if file_path.suffix.lower() in self.allowed_extensions:
                # Check user filter
                if user_id and not file_path.name.startswith(user_id):
                    continue
                
                stat = file_path.stat()
                images.append({
                    "filename": file_path.name,
                    "path": str(file_path),
                    "size": stat.st_size,
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat()
                })
        
        return sorted(images, key=lambda x: x["created"], reverse=True)
