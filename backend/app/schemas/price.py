"""
Chili Price Schemas
===================

Pydantic models for chili price tracking and history.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum


class ChiliType(str, Enum):
    """Types of chili for price tracking."""
    SILING_HABA = "siling_haba"
    SILING_LABUYO = "siling_labuyo"
    SILING_DEMONYO = "siling_demonyo"


class MarketLocation(str, Enum):
    """Common market locations in the Philippines."""
    METRO_MANILA = "metro_manila"
    CEBU = "cebu"
    DAVAO = "davao"
    BAGUIO = "baguio"
    ILOILO = "iloilo"
    CAGAYAN_DE_ORO = "cagayan_de_oro"
    GENERAL_SANTOS = "general_santos"
    ZAMBOANGA = "zamboanga"
    LAGUNA = "laguna"
    PAMPANGA = "pampanga"
    BATANGAS = "batangas"
    NATIONAL_AVERAGE = "national_average"


class PriceUnit(str, Enum):
    """Unit of measurement for prices."""
    PER_KILO = "per_kilo"
    PER_BUNDLE = "per_bundle"
    PER_PIECE = "per_piece"


class PriceEntryCreate(BaseModel):
    """Schema for creating a new price entry."""
    chili_type: ChiliType
    price: float = Field(..., gt=0, description="Price in Philippine Peso")
    unit: PriceUnit = PriceUnit.PER_KILO
    location: MarketLocation = MarketLocation.NATIONAL_AVERAGE
    market_name: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=500)
    recorded_date: Optional[datetime] = None  # Defaults to now if not provided

    class Config:
        json_schema_extra = {
            "example": {
                "chili_type": "siling_labuyo",
                "price": 350.00,
                "unit": "per_kilo",
                "location": "metro_manila",
                "market_name": "Divisoria Market",
                "notes": "Peak season price"
            }
        }


class PriceEntryUpdate(BaseModel):
    """Schema for updating a price entry."""
    price: Optional[float] = Field(None, gt=0)
    unit: Optional[PriceUnit] = None
    location: Optional[MarketLocation] = None
    market_name: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=500)


class PriceEntryResponse(BaseModel):
    """Schema for price entry response."""
    id: str
    chili_type: ChiliType
    price: float
    unit: PriceUnit
    location: MarketLocation
    market_name: Optional[str] = None
    notes: Optional[str] = None
    recorded_date: datetime
    created_by: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PriceHistoryQuery(BaseModel):
    """Query parameters for price history."""
    chili_type: Optional[ChiliType] = None
    location: Optional[MarketLocation] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    limit: int = Field(default=100, le=500)


class PriceTrend(BaseModel):
    """Price trend data point."""
    date: datetime
    average_price: float
    min_price: float
    max_price: float
    sample_count: int


class PriceAnalytics(BaseModel):
    """Analytics for price data."""
    chili_type: ChiliType
    location: MarketLocation
    current_price: float
    price_change_7d: float  # Percentage change
    price_change_30d: float
    avg_price_30d: float
    min_price_30d: float
    max_price_30d: float
    trend: List[PriceTrend]


class CurrentPrices(BaseModel):
    """Current prices for all chili types."""
    siling_haba: Optional[float] = None
    siling_labuyo: Optional[float] = None
    siling_demonyo: Optional[float] = None
    location: MarketLocation
    last_updated: datetime


class PriceComparisonResponse(BaseModel):
    """Price comparison across locations."""
    chili_type: ChiliType
    prices_by_location: dict[str, float]
    national_average: float
    cheapest_location: str
    most_expensive_location: str


class PricePredictionPoint(BaseModel):
    """A single price prediction data point."""
    date: str
    predicted_price: float
    day_offset: int


class PricePredictionSummary(BaseModel):
    """Summary of price predictions."""
    avg_predicted: float
    min_predicted: float
    max_predicted: float
    trend: str
    trend_pct: float


class PricePredictionModelInfo(BaseModel):
    """Info about the prediction model."""
    type: str
    r2_score: float
    mae: float
    trained_at: str


class PricePredictionResponse(BaseModel):
    """Response for price prediction endpoint."""
    chili_type: str
    predictions: List[PricePredictionPoint]
    recent_prices: List[dict]
    summary: PricePredictionSummary
    model_info: PricePredictionModelInfo
