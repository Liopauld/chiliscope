"""
Recommendations Routes
======================

Endpoints for heat level recommendations.
"""

from datetime import datetime
import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.database import MongoDB, Collections
from app.core.security import get_current_user
from app.schemas.recommendation import (
    RecommendationResponse,
    CulinaryRecommendation,
    ProductRecommendation,
    MarketRecommendation,
    SafetyRecommendation,
    HarvestRecommendation,
    SimilarVariety,
    RecommendationFeedback,
    CulinaryGuideRequest,
    CulinaryGuideResponse,
)
from app.schemas.sample import HeatCategory, ChiliVariety

router = APIRouter()


# Recommendation data
CULINARY_USES = {
    HeatCategory.MILD: {
        "uses": [
            "Stuffing and grilling",
            "Fresh salads",
            "Mild sauces and dips",
            "Pickling",
            "Stir-fry dishes"
        ],
        "preparation_tips": [
            "Can be eaten raw",
            "Seeds add mild heat if included",
            "Great for beginners to spicy food"
        ],
        "pairing_suggestions": [
            "Cream-based dishes",
            "Eggs and breakfast items",
            "Light soups"
        ],
        "heat_management_tips": [
            "No special precautions needed",
            "Suitable for children and seniors"
        ]
    },
    HeatCategory.MEDIUM: {
        "uses": [
            "Adobo and sinigang",
            "Stir-fry dishes",
            "Medium-heat sauces",
            "Marinades",
            "Filipino kare-kare"
        ],
        "preparation_tips": [
            "Remove seeds to reduce heat",
            "Roasting enhances flavor",
            "Pairs well with vinegar"
        ],
        "pairing_suggestions": [
            "Pork and chicken dishes",
            "Rice-based meals",
            "Noodle dishes (pancit)"
        ],
        "heat_management_tips": [
            "Add gradually while cooking",
            "Balance with coconut milk"
        ]
    },
    HeatCategory.HOT: {
        "uses": [
            "Hot sauces",
            "Spicy vinegar (suka)",
            "Labuyo oil infusion",
            "Dry chili flakes",
            "Spicy condiments"
        ],
        "preparation_tips": [
            "Use sparingly",
            "Toast before grinding",
            "Infuse in oil for controlled heat"
        ],
        "pairing_suggestions": [
            "Grilled meats",
            "Seafood dishes",
            "Strong-flavored dishes"
        ],
        "heat_management_tips": [
            "Start with small amounts",
            "Dairy reduces heat sensation",
            "Have rice ready to neutralize"
        ]
    },
    HeatCategory.EXTRA_HOT: {
        "uses": [
            "Extra hot sauce production",
            "Extreme spice challenges",
            "Small amounts for flavoring",
            "Export to specialty markets",
            "Capsaicin extraction"
        ],
        "preparation_tips": [
            "Use minimal quantities",
            "Always wear gloves",
            "Work in ventilated area"
        ],
        "pairing_suggestions": [
            "Only for extreme spice enthusiasts",
            "Industrial sauce production"
        ],
        "heat_management_tips": [
            "Never touch face while handling",
            "Have milk ready for emergencies",
            "Keep away from children"
        ]
    }
}

PRODUCT_CATEGORIES = {
    ChiliVariety.SILING_HABA: {
        "categories": ["Fresh market", "Restaurant supply", "Home cooking", "Pickle production"],
        "processing_methods": ["Fresh sale", "Pickling", "Freezing", "Drying"],
        "value_added_products": ["Pickled peppers", "Stuffed peppers", "Pepper paste"]
    },
    ChiliVariety.SILING_LABUYO: {
        "categories": ["Spice production", "Sauce manufacturing", "Export", "Premium condiments"],
        "processing_methods": ["Drying", "Oil infusion", "Sauce making", "Grinding"],
        "value_added_products": ["Labuyo oil", "Hot sauce", "Chili flakes", "Spicy vinegar"]
    },
    ChiliVariety.SILING_DEMONYO: {
        "categories": ["Specialty hot sauce", "Extreme spice products", "Premium market", "Export"],
        "processing_methods": ["Careful drying", "Controlled extraction", "Premium packaging"],
        "value_added_products": ["Demonyo hot sauce", "Extreme chili oil", "Specialty exports"]
    }
}

SAFETY_RECOMMENDATIONS = {
    HeatCategory.MILD: {
        "handling_precautions": [
            "Generally safe for direct handling",
            "Wash hands after cutting"
        ],
        "storage_recommendations": [
            "Refrigerate for up to 2 weeks",
            "Store in paper bag for freshness"
        ],
        "equipment_needed": ["Standard kitchen knife", "Cutting board"],
        "first_aid_tips": ["No special precautions needed"]
    },
    HeatCategory.MEDIUM: {
        "handling_precautions": [
            "Wash hands thoroughly after handling",
            "Keep away from eyes",
            "Use caution when cooking"
        ],
        "storage_recommendations": [
            "Refrigerate for up to 2 weeks",
            "Can be frozen for longer storage"
        ],
        "equipment_needed": ["Standard kitchen equipment"],
        "first_aid_tips": ["Wash affected area with soap", "Use milk for mouth burn"]
    },
    HeatCategory.HOT: {
        "handling_precautions": [
            "Consider wearing gloves",
            "Avoid touching face",
            "Work in ventilated area"
        ],
        "storage_recommendations": [
            "Store in airtight container",
            "Keep away from other foods to prevent transfer"
        ],
        "equipment_needed": ["Disposable gloves recommended", "Ventilated workspace"],
        "first_aid_tips": [
            "Wash hands with dish soap (cuts oil)",
            "Apply vegetable oil then wash for skin burn",
            "Milk or dairy for mouth/tongue"
        ]
    },
    HeatCategory.EXTRA_HOT: {
        "handling_precautions": [
            "Always wear gloves when handling",
            "Avoid touching face or eyes",
            "Work in well-ventilated area",
            "Keep away from children and pets"
        ],
        "storage_recommendations": [
            "Store in clearly labeled container",
            "Keep in separate area of refrigerator",
            "Use protective covering"
        ],
        "equipment_needed": [
            "Nitrile gloves (required)",
            "Safety goggles for grinding",
            "Well-ventilated area"
        ],
        "first_aid_tips": [
            "Flush eyes with saline if contact",
            "Seek medical attention for severe reactions",
            "Have milk or dairy products ready",
            "Cool water may intensify burn"
        ]
    }
}

SIMILAR_VARIETIES = {
    ChiliVariety.SILING_HABA: [
        SimilarVariety(
            variety_name="Anaheim Pepper",
            origin="USA (New Mexico)",
            similarity_score=0.85,
            shu_range="500-2,500 SHU",
            common_uses=["Stuffing", "Roasting", "Mild sauces"]
        ),
        SimilarVariety(
            variety_name="Cubanelle",
            origin="Cuba/Italy",
            similarity_score=0.80,
            shu_range="0-1,000 SHU",
            common_uses=["Frying", "Stuffing", "Salads"]
        )
    ],
    ChiliVariety.SILING_LABUYO: [
        SimilarVariety(
            variety_name="Thai Bird's Eye",
            origin="Thailand",
            similarity_score=0.90,
            shu_range="50,000-100,000 SHU",
            common_uses=["Thai cuisine", "Hot sauces", "Curries"]
        ),
        SimilarVariety(
            variety_name="Piri Piri",
            origin="Africa/Portugal",
            similarity_score=0.85,
            shu_range="50,000-175,000 SHU",
            common_uses=["Portuguese cuisine", "Chicken dishes", "Sauces"]
        )
    ],
    ChiliVariety.SILING_DEMONYO: [
        SimilarVariety(
            variety_name="Habanero",
            origin="Mexico",
            similarity_score=0.75,
            shu_range="100,000-350,000 SHU",
            common_uses=["Extreme hot sauces", "Specialty products"]
        ),
        SimilarVariety(
            variety_name="Scotch Bonnet",
            origin="Caribbean",
            similarity_score=0.70,
            shu_range="100,000-350,000 SHU",
            common_uses=["Caribbean cuisine", "Jerk seasoning"]
        )
    ]
}


@router.post("/generate/{sample_id}", response_model=RecommendationResponse)
async def generate_recommendations(
    sample_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate recommendations for a chili sample based on its predictions.
    """
    samples_collection = MongoDB.get_collection(Collections.CHILI_SAMPLES)
    
    # Get sample with predictions
    sample = await samples_collection.find_one({
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
    
    predictions = sample.get("predictions")
    if not predictions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sample has no predictions. Run analysis first."
        )
    
    # Extract prediction data
    heat_level = HeatCategory(predictions["heat_level"]["heat_category"])
    predicted_shu = predictions["heat_level"]["predicted_shu"]
    variety = ChiliVariety(predictions["variety_classification"]["predicted_variety"])
    
    # Get recommendation data
    culinary_data = CULINARY_USES.get(heat_level, CULINARY_USES[HeatCategory.MEDIUM])
    product_data = PRODUCT_CATEGORIES.get(variety, PRODUCT_CATEGORIES[ChiliVariety.SILING_LABUYO])
    safety_data = SAFETY_RECOMMENDATIONS.get(heat_level, SAFETY_RECOMMENDATIONS[HeatCategory.MEDIUM])
    similar = SIMILAR_VARIETIES.get(variety, [])
    
    recommendation_id = str(uuid.uuid4())
    
    recommendation = RecommendationResponse(
        recommendation_id=recommendation_id,
        sample_id=sample_id,
        heat_level=heat_level,
        predicted_shu=predicted_shu,
        variety=variety,
        culinary=CulinaryRecommendation(**culinary_data),
        products=ProductRecommendation(**product_data),
        market=MarketRecommendation(
            target_markets=["Local wet markets", "Supermarkets", "Restaurants"],
            pricing_tier="Standard" if heat_level in [HeatCategory.MILD, HeatCategory.MEDIUM] else "Premium",
            positioning_strategy=f"Position as {heat_level.value.lower()} heat {variety.value} for {', '.join(product_data['categories'][:2])}",
            export_potential="High" if variety == ChiliVariety.SILING_LABUYO else "Moderate"
        ),
        safety=SafetyRecommendation(**safety_data),
        harvest=HarvestRecommendation(
            optimal_harvest_window="5-7 days" if predictions["maturity_score"]["stage"] == "Mature" else "Monitor daily",
            indicators=[
                "Full color development",
                "Firm texture",
                "Slight give when pressed"
            ],
            post_harvest_handling=[
                "Handle gently to avoid bruising",
                "Store at 7-10°C",
                "Use within 2 weeks for best quality"
            ]
        ),
        similar_varieties=similar,
        created_at=datetime.utcnow()
    )
    
    # Store recommendation
    recommendations_collection = MongoDB.get_collection(Collections.RECOMMENDATIONS)
    await recommendations_collection.insert_one({
        "recommendation_id": recommendation_id,
        "sample_id": sample_id,
        "user_id": current_user["user_id"],
        "heat_level": heat_level.value,
        "predicted_shu": predicted_shu,
        "variety": variety.value,
        "created_at": datetime.utcnow()
    })
    
    return recommendation


@router.get("/{recommendation_id}", response_model=RecommendationResponse)
async def get_recommendation(
    recommendation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific recommendation."""
    collection = MongoDB.get_collection(Collections.RECOMMENDATIONS)
    
    rec = await collection.find_one({
        "recommendation_id": recommendation_id,
        "user_id": current_user["user_id"]
    })
    
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    # Regenerate full recommendation from stored data
    heat_level = HeatCategory(rec["heat_level"])
    variety = ChiliVariety(rec["variety"])
    
    culinary_data = CULINARY_USES.get(heat_level, CULINARY_USES[HeatCategory.MEDIUM])
    product_data = PRODUCT_CATEGORIES.get(variety, PRODUCT_CATEGORIES[ChiliVariety.SILING_LABUYO])
    safety_data = SAFETY_RECOMMENDATIONS.get(heat_level, SAFETY_RECOMMENDATIONS[HeatCategory.MEDIUM])
    similar = SIMILAR_VARIETIES.get(variety, [])
    
    return RecommendationResponse(
        recommendation_id=rec["recommendation_id"],
        sample_id=rec["sample_id"],
        heat_level=heat_level,
        predicted_shu=rec["predicted_shu"],
        variety=variety,
        culinary=CulinaryRecommendation(**culinary_data),
        products=ProductRecommendation(**product_data),
        market=MarketRecommendation(
            target_markets=["Local wet markets", "Supermarkets", "Restaurants"],
            pricing_tier="Standard" if heat_level in [HeatCategory.MILD, HeatCategory.MEDIUM] else "Premium",
            positioning_strategy=f"Position as {heat_level.value.lower()} heat {variety.value}",
            export_potential="High" if variety == ChiliVariety.SILING_LABUYO else "Moderate"
        ),
        safety=SafetyRecommendation(**safety_data),
        similar_varieties=similar,
        created_at=rec["created_at"]
    )


@router.post("/{recommendation_id}/feedback")
async def submit_feedback(
    recommendation_id: str,
    feedback: RecommendationFeedback,
    current_user: dict = Depends(get_current_user)
):
    """Submit feedback on a recommendation."""
    collection = MongoDB.get_collection(Collections.RECOMMENDATIONS)
    
    result = await collection.update_one(
        {
            "recommendation_id": recommendation_id,
            "user_id": current_user["user_id"]
        },
        {
            "$set": {
                "user_feedback": {
                    "rating": feedback.rating,
                    "was_accurate": feedback.was_accurate,
                    "comments": feedback.comments,
                    "submitted_at": datetime.utcnow()
                }
            }
        }
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recommendation not found"
        )
    
    return {"message": "Feedback submitted successfully"}


@router.post("/culinary-guide", response_model=CulinaryGuideResponse)
async def get_culinary_guide(request: CulinaryGuideRequest):
    """Get culinary guide for a heat level."""
    
    shu_ranges = {
        HeatCategory.MILD: "0 - 5,000 SHU",
        HeatCategory.MEDIUM: "5,001 - 15,000 SHU",
        HeatCategory.HOT: "15,001 - 50,000 SHU",
        HeatCategory.EXTRA_HOT: "50,000+ SHU"
    }
    
    descriptions = {
        HeatCategory.MILD: "Perfect for everyday cooking with gentle warmth",
        HeatCategory.MEDIUM: "Noticeable heat that adds excitement without overwhelming",
        HeatCategory.HOT: "Significant heat for spice enthusiasts",
        HeatCategory.EXTRA_HOT: "Extreme heat for the bravest palates only"
    }
    
    filipino_dishes = {
        HeatCategory.MILD: ["Ginisang sayote", "Pinakbet (mild)", "Tinola"],
        HeatCategory.MEDIUM: ["Adobo", "Sinigang", "Bicol Express (mild version)"],
        HeatCategory.HOT: ["Bicol Express", "Laing", "Spicy sisig"],
        HeatCategory.EXTRA_HOT: ["Challenge dishes only", "Extreme Bicol Express"]
    }
    
    international_dishes = {
        HeatCategory.MILD: ["Stuffed peppers", "Mild curry", "Fajitas"],
        HeatCategory.MEDIUM: ["Thai basil chicken", "Kung pao chicken", "Medium curry"],
        HeatCategory.HOT: ["Tom yum", "Vindaloo", "Sichuan dishes"],
        HeatCategory.EXTRA_HOT: ["Phaal curry", "Carolina Reaper dishes", "Challenge foods"]
    }
    
    culinary_data = CULINARY_USES.get(request.heat_level, CULINARY_USES[HeatCategory.MEDIUM])
    
    return CulinaryGuideResponse(
        heat_level=request.heat_level,
        shu_range=shu_ranges[request.heat_level],
        description=descriptions[request.heat_level],
        cooking_methods=culinary_data["preparation_tips"],
        recipe_categories=culinary_data["uses"],
        flavor_profile="Spicy with " + ("subtle warmth" if request.heat_level == HeatCategory.MILD else "intense heat"),
        heat_reduction_tips=culinary_data["heat_management_tips"],
        filipino_dishes=filipino_dishes[request.heat_level],
        international_dishes=international_dishes[request.heat_level]
    )
