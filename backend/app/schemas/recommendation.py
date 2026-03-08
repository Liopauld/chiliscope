"""
Recommendation Schemas
======================

Pydantic models for heat level recommendations.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

from .sample import HeatCategory, ChiliVariety


class CulinaryRecommendation(BaseModel):
    """Culinary use recommendations."""
    uses: List[str]
    preparation_tips: List[str]
    pairing_suggestions: List[str]
    heat_management_tips: List[str]


class ProductRecommendation(BaseModel):
    """Product category recommendations."""
    categories: List[str]
    processing_methods: List[str]
    value_added_products: List[str]


class MarketRecommendation(BaseModel):
    """Market positioning recommendations."""
    target_markets: List[str]
    pricing_tier: str
    positioning_strategy: str
    export_potential: str


class SafetyRecommendation(BaseModel):
    """Safety and handling recommendations."""
    handling_precautions: List[str]
    storage_recommendations: List[str]
    equipment_needed: List[str]
    first_aid_tips: List[str]


class HarvestRecommendation(BaseModel):
    """Harvest timing recommendations."""
    optimal_harvest_window: str
    indicators: List[str]
    post_harvest_handling: List[str]


class SimilarVariety(BaseModel):
    """Similar variety information."""
    variety_name: str
    origin: str
    similarity_score: float = Field(..., ge=0, le=1)
    shu_range: str
    common_uses: List[str]


class RecommendationResponse(BaseModel):
    """Complete recommendation response."""
    recommendation_id: str
    sample_id: str
    
    # Prediction summary
    heat_level: HeatCategory
    predicted_shu: int
    variety: ChiliVariety
    
    # Recommendations
    culinary: CulinaryRecommendation
    products: ProductRecommendation
    market: MarketRecommendation
    safety: SafetyRecommendation
    harvest: Optional[HarvestRecommendation] = None
    
    # Similar varieties
    similar_varieties: List[SimilarVariety] = []
    
    # Metadata
    created_at: datetime
    
    class Config:
        from_attributes = True


class RecommendationFeedback(BaseModel):
    """User feedback on recommendations."""
    recommendation_id: str
    rating: int = Field(..., ge=1, le=5)
    was_accurate: bool
    comments: Optional[str] = None
    helpful_recommendations: Optional[List[str]] = None


class CulinaryGuideRequest(BaseModel):
    """Request for culinary guide."""
    heat_level: HeatCategory
    cuisine_preference: Optional[str] = None


class CulinaryGuideResponse(BaseModel):
    """Culinary guide response."""
    heat_level: HeatCategory
    shu_range: str
    description: str
    
    # Detailed guides
    cooking_methods: List[str]
    recipe_categories: List[str]
    flavor_profile: str
    heat_reduction_tips: List[str]
    
    # Regional dishes
    filipino_dishes: List[str]
    international_dishes: List[str]


class MarketAnalysisRequest(BaseModel):
    """Request for market analysis."""
    variety: ChiliVariety
    region: Optional[str] = None
    quantity_kg: Optional[float] = None


class MarketAnalysisResponse(BaseModel):
    """Market analysis response."""
    variety: ChiliVariety
    
    # Market data
    current_price_range_php: str
    demand_level: str
    seasonality: str
    
    # Recommendations
    best_selling_channels: List[str]
    value_added_opportunities: List[str]
    
    # Regional insights
    regional_demand: Optional[dict] = None
