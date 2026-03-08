"""
Chili Sample Schemas
====================

Pydantic models for chili sample data.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class ChiliVariety(str, Enum):
    """Chili variety enumeration."""
    SILING_HABA = "Siling Haba"
    SILING_LABUYO = "Siling Labuyo"
    SILING_DEMONYO = "Siling Demonyo"


class HeatCategory(str, Enum):
    """Heat level category enumeration."""
    MILD = "Mild"
    MEDIUM = "Medium"
    HOT = "Hot"
    EXTRA_HOT = "Extra Hot"


class MaturityStage(str, Enum):
    """Maturity stage enumeration."""
    IMMATURE = "Immature"
    DEVELOPING = "Developing"
    MATURE = "Mature"
    OVERRIPE = "Overripe"


class ImageType(str, Enum):
    """Image type enumeration."""
    FLOWER = "flower"
    POD = "pod"
    PLANT = "plant"


class ColorRGB(BaseModel):
    """RGB color values."""
    r: int = Field(..., ge=0, le=255)
    g: int = Field(..., ge=0, le=255)
    b: int = Field(..., ge=0, le=255)


class ColorHSV(BaseModel):
    """HSV color values."""
    h: float = Field(..., ge=0, le=360)
    s: float = Field(..., ge=0, le=100)
    v: float = Field(..., ge=0, le=100)


class GPSLocation(BaseModel):
    """GPS coordinates."""
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class ImageMetadata(BaseModel):
    """Image metadata schema."""
    camera_model: Optional[str] = None
    gps_location: Optional[GPSLocation] = None
    lighting_conditions: Optional[str] = None
    image_quality_score: Optional[float] = Field(None, ge=0, le=100)
    capture_date: Optional[datetime] = None


class SampleImage(BaseModel):
    """Sample image schema."""
    image_id: str
    image_type: ImageType
    original_url: str
    processed_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    metadata: Optional[ImageMetadata] = None


class FlowerMorphology(BaseModel):
    """Flower morphology features."""
    petal_count: Optional[int] = Field(None, ge=3, le=10)
    corolla_diameter_mm: Optional[float] = Field(None, ge=0, le=50)
    color_rgb: Optional[ColorRGB] = None
    color_hsv: Optional[ColorHSV] = None
    stamen_length_mm: Optional[float] = Field(None, ge=0, le=20)
    anther_color: Optional[str] = None
    symmetry_score: Optional[float] = Field(None, ge=0, le=1)


class PodMorphology(BaseModel):
    """Pod morphology features."""
    length_mm: Optional[float] = Field(None, ge=0, le=300)
    width_mm: Optional[float] = Field(None, ge=0, le=50)
    weight_g: Optional[float] = Field(None, ge=0, le=100)
    color_rgb: Optional[ColorRGB] = None
    color_hsv: Optional[ColorHSV] = None
    shape_profile: Optional[str] = None
    surface_texture: Optional[str] = None


class PlantCharacteristics(BaseModel):
    """Plant characteristics."""
    height_cm: Optional[float] = Field(None, ge=0, le=200)
    leaf_size_cm2: Optional[float] = Field(None, ge=0, le=100)
    internode_spacing_cm: Optional[float] = Field(None, ge=0, le=20)
    days_to_flowering: Optional[int] = Field(None, ge=0, le=365)
    days_to_maturity: Optional[int] = Field(None, ge=0, le=365)


class VarietyProbabilities(BaseModel):
    """Variety classification probabilities."""
    siling_haba: float = Field(..., ge=0, le=1, alias="Siling Haba")
    siling_labuyo: float = Field(..., ge=0, le=1, alias="Siling Labuyo")
    siling_demonyo: float = Field(..., ge=0, le=1, alias="Siling Demonyo")
    
    class Config:
        populate_by_name = True


class VarietyClassificationResult(BaseModel):
    """Variety classification result."""
    predicted_variety: ChiliVariety
    confidence: float = Field(..., ge=0, le=1)
    probabilities: VarietyProbabilities


class PredictionRange(BaseModel):
    """SHU prediction range."""
    min_shu: int = Field(..., ge=0)
    max_shu: int = Field(..., ge=0)


class HeatLevelResult(BaseModel):
    """Heat level prediction result."""
    predicted_shu: int = Field(..., ge=0)
    heat_category: HeatCategory
    confidence: float = Field(..., ge=0, le=1)
    prediction_range: PredictionRange


class MaturityResult(BaseModel):
    """Maturity assessment result."""
    score: float = Field(..., ge=0, le=100)
    stage: MaturityStage
    days_to_harvest: Optional[int] = Field(None, ge=0, le=30)


class ModelMetadata(BaseModel):
    """Model metadata for predictions."""
    cnn_model_version: str
    linear_regression_metrics: Optional[dict] = None
    random_forest_metrics: Optional[dict] = None
    decision_tree_metrics: Optional[dict] = None
    processing_time_ms: float


class PredictionsResult(BaseModel):
    """Complete prediction results."""
    variety_classification: VarietyClassificationResult
    heat_level: HeatLevelResult
    maturity_score: MaturityResult


class ActualData(BaseModel):
    """Ground truth data (if available)."""
    actual_shu: Optional[int] = Field(None, ge=0)
    actual_variety: Optional[ChiliVariety] = None
    lab_tested: bool = False
    test_date: Optional[datetime] = None
    capsaicin_content_mg: Optional[float] = Field(None, ge=0)


class ChiliSampleCreate(BaseModel):
    """Schema for creating a new chili sample."""
    variety: Optional[ChiliVariety] = None
    days_since_flowering: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: bool = False


class ChiliSampleUpdate(BaseModel):
    """Schema for updating a chili sample."""
    variety: Optional[ChiliVariety] = None
    notes: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    actual_data: Optional[ActualData] = None


class ChiliSampleResponse(BaseModel):
    """Schema for chili sample response."""
    sample_id: str
    user_id: str
    variety: Optional[ChiliVariety] = None
    
    images: List[SampleImage] = []
    
    flower_morphology: Optional[FlowerMorphology] = None
    pod_morphology: Optional[PodMorphology] = None
    plant_characteristics: Optional[PlantCharacteristics] = None
    
    predictions: Optional[PredictionsResult] = None
    model_metadata: Optional[ModelMetadata] = None
    actual_data: Optional[ActualData] = None
    
    notes: Optional[str] = None
    tags: List[str] = []
    is_public: bool = False
    
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class ChiliSampleSummary(BaseModel):
    """Summary schema for list views."""
    sample_id: str
    variety: Optional[ChiliVariety] = None
    predicted_variety: Optional[ChiliVariety] = None
    predicted_shu: Optional[int] = None
    heat_category: Optional[HeatCategory] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime


class SampleListResponse(BaseModel):
    """Paginated list response for samples."""
    samples: List[ChiliSampleSummary]
    total: int
    page: int
    page_size: int
    total_pages: int
