"""
Application Configuration
=========================

Centralized configuration management using Pydantic Settings.
Loads environment variables from .env file.
"""

from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field
from pathlib import Path
import json

# Get the backend directory (where .env file should be)
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
ENV_FILE_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "ChiliScope"
    app_version: str = "1.0.0"
    debug: bool = True
    environment: str = "development"
    api_v1_prefix: str = "/api/v1"
    
    # MongoDB
    mongodb_url: str = "mongodb://localhost:27017"
    database_name: str = "chili_analyzer"
    
    # JWT Authentication
    jwt_secret_key: str = "your-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    
    # AWS S3
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-southeast-1"
    s3_bucket_name: str = "chili-analyzer-images"
    
    # Redis
    redis_url: str = "redis://localhost:6379/0"
    
    # CORS
    cors_origins: str = '["http://localhost:3000","http://localhost:5173","*"]'
    
    # Cloudinary (for image uploads in forum)
    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""
    cloudinary_folder: str = "chiliscope"  # Folder name in Cloudinary
    
    # Firebase Admin SDK
    firebase_credentials_path: str = ""  # Path to service account JSON
    firebase_project_id: str = ""  # Firebase project ID (auto-detected from credentials if empty)
    google_application_credentials: str = ""  # Alternative path for Google SDK
    
    # Google Gemini AI (Chatbot)
    gemini_api_key: str = ""
    
    # SMTP Email (for ban/deactivation notifications)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from JSON string."""
        # Common dev origins that must always be included
        dev_origins = [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:8081",   # Expo web
            "http://localhost:8082",   # Expo web (alt port)
            "http://localhost:19006",  # Expo web alt
            "http://localhost:80",     # Docker frontend
            "http://localhost",        # Docker frontend (no port)
        ]
        # Production origins
        prod_origins = [
            "https://chiliscope.netlify.app",
        ]
        try:
            origins = json.loads(self.cors_origins)
            if "*" in origins:
                return list(set(dev_origins + prod_origins))
            # Merge configured + dev + prod origins
            merged = list(set(origins + dev_origins + prod_origins))
            return merged
        except json.JSONDecodeError:
            return list(set(dev_origins + prod_origins))
    
    # File Upload
    max_file_size_mb: int = 10
    allowed_extensions: List[str] = ["jpg", "jpeg", "png"]
    
    @property
    def max_file_size_bytes(self) -> int:
        """Convert MB to bytes."""
        return self.max_file_size_mb * 1024 * 1024
    
    # ML Model Paths
    cnn_model_path: str = "ml/models/cnn_variety_classifier.h5"
    rf_model_path: str = "ml/models/random_forest_shu.joblib"
    dt_model_path: str = "ml/models/decision_tree_maturity.joblib"
    lr_model_path: str = "ml/models/linear_regression_shu.joblib"
    
    # Roboflow Configuration
    roboflow_api_key: str = ""
    roboflow_project_id: str = "chili-classification-5ohkl"
    roboflow_model_version: str = "9"
    roboflow_use_hosted: bool = True  # True = hosted API, False = local inference
    
    # Chili Segmentation Model (instance segmentation — detects & classifies pods)
    roboflow_chili_segmentation_api_key: str = ""
    roboflow_chili_segmentation_project_id: str = "chili-segmentation-pl3my"
    roboflow_chili_segmentation_model_version: str = "7"
    
    # Chili Maturity Classifier
    roboflow_maturity_api_key: str = ""
    roboflow_maturity_project_id: str = "chili-maturity-classifier"
    roboflow_maturity_model_version: str = "2"

    # Flower Segmentation Model (legacy — detects flower/pod regions)
    roboflow_segmentation_project_id: str = "flower-segmentation-brl0m"
    roboflow_segmentation_model_version: str = "5"
    
    # Flower Stress Classifier (healthy vs moderate_stress)
    roboflow_flower_stress_api_key: str = ""
    roboflow_flower_stress_project_id: str = "chili-flower-stress-class"
    roboflow_flower_stress_model_version: str = "1"
    
    # Image Processing
    image_size: tuple = (512, 512)
    
    # Heat Level Categories (SHU ranges)
    heat_categories: dict = {
        "Mild": {"min": 0, "max": 5000},
        "Medium": {"min": 5001, "max": 15000},
        "Hot": {"min": 15001, "max": 50000},
        "Extra Hot": {"min": 50001, "max": 500000}
    }
    
    # Chili Varieties
    chili_varieties: List[str] = ["Siling Haba", "Siling Labuyo", "Siling Demonyo"]
    
    class Config:
        env_file = str(ENV_FILE_PATH)
        env_file_encoding = "utf-8"
        case_sensitive = False
        extra = "ignore"


# Create global settings instance
settings = Settings()
