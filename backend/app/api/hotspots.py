"""
Chili Map Hotspots API
======================
CRUD endpoints for chili growing/market hotspots in the Philippines.
Public read access; admin-only write access.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from pydantic import BaseModel, Field
from bson import ObjectId
import logging

from app.core.database import MongoDB
from app.core.security import get_current_user, require_admin

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Schemas ──────────────────────────────────────────────────────────────────

class HotspotCreate(BaseModel):
    name: str
    region: str
    province: str
    lat: float
    lng: float
    type: str = "market"  # market | farm | both
    chilies: list[str] = []
    description: str = ""
    famous_for: str = ""
    rating: float = 3.0
    best_season: str = ""
    tips: Optional[str] = None

class HotspotUpdate(BaseModel):
    name: Optional[str] = None
    region: Optional[str] = None
    province: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    type: Optional[str] = None
    chilies: Optional[list[str]] = None
    description: Optional[str] = None
    famous_for: Optional[str] = None
    rating: Optional[float] = None
    best_season: Optional[str] = None
    tips: Optional[str] = None

class HotspotResponse(BaseModel):
    id: str
    name: str
    region: str
    province: str
    lat: float
    lng: float
    type: str
    chilies: list[str]
    description: str
    famous_for: str
    rating: float
    best_season: str
    tips: Optional[str] = None


def _doc_to_response(doc: dict) -> HotspotResponse:
    return HotspotResponse(
        id=str(doc["_id"]),
        name=doc["name"],
        region=doc.get("region", ""),
        province=doc.get("province", ""),
        lat=doc["lat"],
        lng=doc["lng"],
        type=doc.get("type", "market"),
        chilies=doc.get("chilies", []),
        description=doc.get("description", ""),
        famous_for=doc.get("famous_for", ""),
        rating=doc.get("rating", 3),
        best_season=doc.get("best_season", ""),
        tips=doc.get("tips"),
    )


# ── Default seed data ───────────────────────────────────────────────────────

DEFAULT_HOTSPOTS = [
    {"name": "Naga City Public Market", "region": "Bicol Region", "province": "Camarines Sur", "lat": 13.6218, "lng": 123.1948, "type": "market", "chilies": ["siling_labuyo", "siling_haba", "siling_demonyo"], "description": "The heart of Bicolano chili culture. Naga City is considered the chili capital of the Philippines.", "famous_for": "Bicol Express ingredients, fresh Siling Labuyo, wholesale chili trading", "rating": 5, "best_season": "Year-round (peak: March\u2013May)", "tips": "Visit early morning for the freshest picks."},
    {"name": "Legazpi Chili Farms", "region": "Bicol Region", "province": "Albay", "lat": 13.1391, "lng": 123.7438, "type": "farm", "chilies": ["siling_labuyo", "siling_haba", "siling_demonyo"], "description": "Vast chili farms at the foot of Mayon Volcano. Volcanic soil makes for exceptionally flavorful chilies.", "famous_for": "Volcanic soil-grown chilies, farm tours, Siling Demonyo cultivation", "rating": 5, "best_season": "October\u2013May (dry season)", "tips": "Some farms offer u-pick experiences."},
    {"name": "Sorsogon Pepper Farms", "region": "Bicol Region", "province": "Sorsogon", "lat": 12.9742, "lng": 124.0049, "type": "farm", "chilies": ["siling_labuyo", "siling_haba"], "description": "Southern tip of Luzon where ocean breezes create unique growing conditions.", "famous_for": "Salt-air Siling Labuyo, organic farming practices", "rating": 4, "best_season": "November\u2013April"},
    {"name": "Iriga City Market", "region": "Bicol Region", "province": "Camarines Sur", "lat": 13.4214, "lng": 123.4132, "type": "market", "chilies": ["siling_labuyo", "siling_haba", "siling_demonyo"], "description": "A bustling Bicolano market famous for its spicy local cuisine and fresh ingredients.", "famous_for": "Laing ingredients, dried chili flakes, Bicolano spice blends", "rating": 4, "best_season": "Year-round"},
    {"name": "Daraga Heritage Market", "region": "Bicol Region", "province": "Albay", "lat": 13.1595, "lng": 123.6989, "type": "both", "chilies": ["siling_labuyo", "siling_haba", "siling_demonyo"], "description": "Near the famous Daraga Church, this market is a treasure trove of heirloom chili varieties.", "famous_for": "Heirloom Bicolano chili seeds, fresh from Mayon slopes", "rating": 4, "best_season": "Year-round"},
    {"name": "Divisoria Market", "region": "Metro Manila", "province": "Manila", "lat": 14.6012, "lng": 120.9734, "type": "market", "chilies": ["siling_labuyo", "siling_haba"], "description": "The largest wholesale market in Metro Manila.", "famous_for": "Bulk chili wholesale, dried chili imports, commercial-grade supply", "rating": 4, "best_season": "Year-round"},
    {"name": "Balintawak Market", "region": "Metro Manila", "province": "Quezon City", "lat": 14.6577, "lng": 121.0040, "type": "market", "chilies": ["siling_labuyo", "siling_haba", "siling_demonyo"], "description": "Metro Manila\u2019s premier fresh produce market.", "famous_for": "Freshest Siling Labuyo in Manila, variety selection, early-morning deals", "rating": 4, "best_season": "Year-round"},
    {"name": "Laoag Chili Gardens", "region": "Ilocos Region", "province": "Ilocos Norte", "lat": 18.1973, "lng": 120.5933, "type": "farm", "chilies": ["siling_labuyo"], "description": "North Luzon\u2019s premier chili growing area.", "famous_for": "Ilocano Siling Labuyo, bagnet chili dips, sukang Iloko chili infusions", "rating": 3, "best_season": "October\u2013March"},
    {"name": "Vigan Heritage Farms", "region": "Ilocos Region", "province": "Ilocos Sur", "lat": 17.5747, "lng": 120.3869, "type": "farm", "chilies": ["siling_labuyo", "siling_haba"], "description": "Heritage farms near the UNESCO World Heritage City.", "famous_for": "Heritage variety preservation, empanada chili sauce", "rating": 4, "best_season": "November\u2013April"},
    {"name": "Iloilo La Paz Market", "region": "Western Visayas", "province": "Iloilo", "lat": 10.7130, "lng": 122.5644, "type": "market", "chilies": ["siling_labuyo", "siling_haba"], "description": "Home of the famous La Paz Batchoy.", "famous_for": "La Paz Batchoy chili toppings, Ilonggo chili vinegar", "rating": 4, "best_season": "Year-round"},
    {"name": "Bacolod Organic Farms", "region": "Western Visayas", "province": "Negros Occidental", "lat": 10.6840, "lng": 122.9563, "type": "farm", "chilies": ["siling_labuyo", "siling_haba"], "description": "Negros Island\u2019s organic farming movement.", "famous_for": "Organic Siling Labuyo, chicken inasal chili sauce", "rating": 4, "best_season": "October\u2013April"},
    {"name": "Carbon Market", "region": "Central Visayas", "province": "Cebu", "lat": 10.2933, "lng": 123.8988, "type": "market", "chilies": ["siling_labuyo", "siling_haba"], "description": "Cebu\u2019s oldest and largest public market.", "famous_for": "Cebuano chili vinegar (sukang pinakurat), dried chili flakes", "rating": 4, "best_season": "Year-round"},
    {"name": "Davao Agdao Market", "region": "Davao Region", "province": "Davao del Sur", "lat": 7.0890, "lng": 125.6136, "type": "market", "chilies": ["siling_labuyo", "siling_haba", "siling_demonyo"], "description": "Mindanao\u2019s largest city market with incredible variety.", "famous_for": "Mindanaoan chili sauces, kinilaw chili garnish", "rating": 4, "best_season": "Year-round"},
    {"name": "Bukidnon Highland Farms", "region": "Northern Mindanao", "province": "Bukidnon", "lat": 8.0515, "lng": 125.0536, "type": "farm", "chilies": ["siling_labuyo", "siling_haba"], "description": "High-altitude farms in the Bukidnon plateau.", "famous_for": "Cool-climate chili cultivation, highland Siling Labuyo", "rating": 3, "best_season": "October\u2013May"},
    {"name": "General Santos Chili Farms", "region": "SOCCSKSARGEN", "province": "South Cotabato", "lat": 6.1108, "lng": 125.1716, "type": "farm", "chilies": ["siling_labuyo", "siling_haba"], "description": "Southern Mindanao\u2019s agricultural hub.", "famous_for": "Commercial-scale chili production, tuna kinilaw chilies", "rating": 3, "best_season": "Year-round"},
    {"name": "Tagaytay Farmers Market", "region": "CALABARZON", "province": "Cavite", "lat": 14.1054, "lng": 120.9392, "type": "both", "chilies": ["siling_labuyo", "siling_haba", "siling_demonyo"], "description": "The cool highland market of Tagaytay.", "famous_for": "Weekend farmers market, bulalo chili condiments, artisanal hot sauces", "rating": 4, "best_season": "Year-round"},
    {"name": "Bay Laguna Farms", "region": "CALABARZON", "province": "Laguna", "lat": 14.1783, "lng": 121.2816, "type": "farm", "chilies": ["siling_labuyo", "siling_haba"], "description": "Located near UPLB, this area benefits from agricultural research and the university\u2019s extension programs.", "famous_for": "Research-backed chili varieties, university-developed cultivars", "rating": 4, "best_season": "October\u2013May"},
    {"name": "Batangas City Market", "region": "CALABARZON", "province": "Batangas", "lat": 13.7565, "lng": 121.0583, "type": "market", "chilies": ["siling_labuyo", "siling_haba"], "description": "A vibrant provincial market with strong agricultural traditions.", "famous_for": "Batangas kapeng barako chili pairings, lomi chili dips", "rating": 3, "best_season": "Year-round"},
    {"name": "Tarlac Chili Plantations", "region": "Central Luzon", "province": "Tarlac", "lat": 15.4371, "lng": 120.5959, "type": "farm", "chilies": ["siling_labuyo", "siling_haba"], "description": "Central Luzon\u2019s flat plains create ideal conditions for large-scale chili farming.", "famous_for": "Commercial Siling Haba production, chili processing facilities", "rating": 3, "best_season": "October\u2013May"},
    {"name": "San Fernando Public Market", "region": "Central Luzon", "province": "Pampanga", "lat": 14.9551, "lng": 120.6898, "type": "market", "chilies": ["siling_haba", "siling_labuyo"], "description": "The culinary capital of the Philippines!", "famous_for": "Chef-quality Siling Haba, sisig chili components, gourmet chili oils", "rating": 4, "best_season": "Year-round"},
    {"name": "Tuguegarao Chili Farms", "region": "Cagayan Valley", "province": "Cagayan", "lat": 17.6132, "lng": 121.7270, "type": "farm", "chilies": ["siling_labuyo"], "description": "The hottest province in the Philippines. Extreme heat produces exceptionally potent Siling Labuyo.", "famous_for": "Super-hot Siling Labuyo, pancit batil patong chili garnish", "rating": 3, "best_season": "October\u2013March"},
]


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("", response_model=list[HotspotResponse])
async def list_hotspots(
    chili: Optional[str] = None,
    type: Optional[str] = None,
):
    """List all hotspots (public). Falls back to seed data if DB is empty."""
    db = MongoDB.database
    query: dict = {}
    if chili:
        query["chilies"] = chili
    if type:
        query["type"] = type

    cursor = db["hotspots"].find(query)
    docs = await cursor.to_list(length=200)

    if not docs and not query:
        # Seed default data on first access
        await db["hotspots"].insert_many([{**h} for h in DEFAULT_HOTSPOTS])
        docs = await db["hotspots"].find({}).to_list(length=200)

    return [_doc_to_response(d) for d in docs]


@router.post("", response_model=HotspotResponse, status_code=status.HTTP_201_CREATED)
async def create_hotspot(
    data: HotspotCreate,
    current_user: dict = Depends(require_admin),
):
    """Create a new hotspot (admin only)."""
    doc = data.model_dump()
    result = await MongoDB.database["hotspots"].insert_one(doc)
    doc["_id"] = result.inserted_id
    return _doc_to_response(doc)


@router.put("/{hotspot_id}", response_model=HotspotResponse)
async def update_hotspot(
    hotspot_id: str,
    data: HotspotUpdate,
    current_user: dict = Depends(require_admin),
):
    """Update a hotspot (admin only)."""
    update_doc = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_doc:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await MongoDB.database["hotspots"].find_one_and_update(
        {"_id": ObjectId(hotspot_id)},
        {"$set": update_doc},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    return _doc_to_response(result)


@router.delete("/{hotspot_id}")
async def delete_hotspot(
    hotspot_id: str,
    current_user: dict = Depends(require_admin),
):
    """Delete a hotspot (admin only)."""
    result = await MongoDB.database["hotspots"].delete_one({"_id": ObjectId(hotspot_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    return {"message": "Hotspot deleted"}
