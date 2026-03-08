"""
Recommendation Engine
=====================

Generate recommendations based on heat level predictions.
"""

from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """
    Generate culinary, product, and safety recommendations
    based on predicted heat levels and variety.
    """
    
    def __init__(self):
        self._load_recommendation_rules()
    
    def _load_recommendation_rules(self):
        """Load recommendation rules."""
        
        # Culinary uses by heat level
        self.culinary_uses = {
            "Mild": [
                "Stuffing and grilling",
                "Fresh salads",
                "Mild sauces and dips",
                "Pickling (atchara style)",
                "Stir-fry dishes",
                "Garnishing"
            ],
            "Medium": [
                "Adobo and sinigang",
                "Stir-fry dishes",
                "Medium-heat sauces",
                "Marinades and rubs",
                "Kare-kare",
                "Tinola variations"
            ],
            "Hot": [
                "Hot sauces (sawsawan)",
                "Spicy vinegar (suka labuyo)",
                "Labuyo oil infusion",
                "Dry chili flakes",
                "Bicol Express",
                "Laing"
            ],
            "Extra Hot": [
                "Extra hot sauce production",
                "Extreme spice challenges",
                "Small amounts for flavoring",
                "Specialty exports",
                "Capsaicin extraction"
            ]
        }
        
        # Product categories by variety
        self.product_categories = {
            "Siling Haba": [
                "Fresh market vegetables",
                "Restaurant supply",
                "Home cooking staple",
                "Pickle production",
                "Frozen vegetables"
            ],
            "Siling Labuyo": [
                "Spice production",
                "Hot sauce manufacturing",
                "Dried chili products",
                "Chili oil",
                "Export market"
            ],
            "Siling Demonyo": [
                "Specialty hot sauce",
                "Premium spice products",
                "Capsaicin extraction",
                "Challenge food products",
                "International export"
            ]
        }
        
        # Market positioning
        self.market_positioning = {
            "Mild": {
                "tier": "Mass market",
                "target": "General consumers, families",
                "channels": ["Supermarkets", "Wet markets", "Restaurants"]
            },
            "Medium": {
                "tier": "Standard",
                "target": "Regular spice consumers",
                "channels": ["Supermarkets", "Restaurants", "Food service"]
            },
            "Hot": {
                "tier": "Premium",
                "target": "Spice enthusiasts, sauce makers",
                "channels": ["Specialty stores", "Online", "Export"]
            },
            "Extra Hot": {
                "tier": "Ultra-premium",
                "target": "Extreme spice seekers, specialty manufacturers",
                "channels": ["Specialty online", "International export"]
            }
        }
        
        # Safety precautions
        self.safety_precautions = {
            "Mild": [
                "Generally safe for direct handling",
                "Wash hands after cutting",
                "Safe for children in small amounts"
            ],
            "Medium": [
                "Wash hands thoroughly after handling",
                "Keep away from eyes",
                "May irritate sensitive skin"
            ],
            "Hot": [
                "Consider wearing gloves when handling",
                "Avoid touching face or eyes",
                "Work in ventilated area when cooking",
                "Keep away from children"
            ],
            "Extra Hot": [
                "Always wear gloves when handling",
                "Never touch face or eyes during handling",
                "Work in well-ventilated area",
                "Keep away from children and pets",
                "Have milk or dairy products ready"
            ]
        }
        
        # Storage recommendations
        self.storage_recommendations = {
            "fresh": {
                "temperature": "7-10°C (refrigerator)",
                "duration": "1-2 weeks",
                "container": "Paper bag or perforated plastic"
            },
            "dried": {
                "temperature": "Room temperature, dry place",
                "duration": "6-12 months",
                "container": "Airtight container"
            },
            "frozen": {
                "temperature": "-18°C (freezer)",
                "duration": "6-12 months",
                "container": "Freezer bags, remove air"
            }
        }
        
        # Similar international varieties
        self.similar_varieties = {
            "Siling Haba": [
                {"name": "Anaheim Pepper", "origin": "USA", "shu": "500-2,500"},
                {"name": "Cubanelle", "origin": "Cuba/Italy", "shu": "0-1,000"},
                {"name": "Banana Pepper", "origin": "USA", "shu": "0-500"}
            ],
            "Siling Labuyo": [
                {"name": "Thai Bird's Eye", "origin": "Thailand", "shu": "50,000-100,000"},
                {"name": "Piri Piri", "origin": "Africa/Portugal", "shu": "50,000-175,000"},
                {"name": "Malagueta", "origin": "Brazil", "shu": "60,000-100,000"}
            ],
            "Siling Demonyo": [
                {"name": "Habanero", "origin": "Mexico", "shu": "100,000-350,000"},
                {"name": "Scotch Bonnet", "origin": "Caribbean", "shu": "100,000-350,000"},
                {"name": "Ghost Pepper", "origin": "India", "shu": "1,000,000+"}
            ]
        }
    
    def generate_recommendations(
        self,
        predicted_shu: int,
        variety: str,
        heat_category: str,
        maturity_stage: Optional[str] = None
    ) -> Dict:
        """
        Generate comprehensive recommendations.
        
        Args:
            predicted_shu: Predicted Scoville Heat Units
            variety: Chili variety
            heat_category: Heat category (Mild, Medium, Hot, Extra Hot)
            maturity_stage: Optional maturity stage
            
        Returns:
            Dictionary with all recommendations
        """
        recommendations = {
            "heat_summary": {
                "shu": predicted_shu,
                "category": heat_category,
                "description": self._get_heat_description(heat_category)
            },
            "culinary": self._get_culinary_recommendations(heat_category),
            "products": self._get_product_recommendations(variety),
            "market": self._get_market_recommendations(heat_category, variety),
            "safety": self._get_safety_recommendations(heat_category),
            "storage": self.storage_recommendations,
            "similar_varieties": self.similar_varieties.get(variety, [])
        }
        
        if maturity_stage:
            recommendations["harvest"] = self._get_harvest_recommendations(maturity_stage)
        
        return recommendations
    
    def _get_heat_description(self, heat_category: str) -> str:
        """Get description of heat level."""
        descriptions = {
            "Mild": "Gentle warmth suitable for everyday cooking. Pleasant heat that won't overwhelm.",
            "Medium": "Noticeable heat that adds excitement without being overwhelming. Good for most dishes.",
            "Hot": "Significant heat for spice enthusiasts. Use with caution in cooking.",
            "Extra Hot": "Extreme heat for the bravest palates. Handle with care and use sparingly."
        }
        return descriptions.get(heat_category, "")
    
    def _get_culinary_recommendations(self, heat_category: str) -> Dict:
        """Get culinary recommendations."""
        uses = self.culinary_uses.get(heat_category, [])
        
        # Add preparation tips
        prep_tips = {
            "Mild": [
                "Can be eaten raw for fresh, mild heat",
                "Seeds add extra heat if included",
                "Great for introducing spice to beginners"
            ],
            "Medium": [
                "Remove seeds to reduce heat",
                "Roasting enhances flavor while mellowing heat",
                "Pairs well with vinegar for balance"
            ],
            "Hot": [
                "Use sparingly - a little goes a long way",
                "Toast before grinding for deeper flavor",
                "Infuse in oil for controlled heat release"
            ],
            "Extra Hot": [
                "Use minimal quantities",
                "Never cook with high heat (releases capsaicin fumes)",
                "Balance with acidic or dairy ingredients"
            ]
        }
        
        return {
            "uses": uses,
            "preparation_tips": prep_tips.get(heat_category, [])
        }
    
    def _get_product_recommendations(self, variety: str) -> Dict:
        """Get product category recommendations."""
        categories = self.product_categories.get(variety, [])
        
        processing_methods = {
            "Siling Haba": ["Fresh sale", "Pickling", "Freezing", "Drying"],
            "Siling Labuyo": ["Drying", "Oil infusion", "Sauce making", "Grinding"],
            "Siling Demonyo": ["Controlled drying", "Premium sauce production", "Extract"]
        }
        
        return {
            "categories": categories,
            "processing_methods": processing_methods.get(variety, [])
        }
    
    def _get_market_recommendations(self, heat_category: str, variety: str) -> Dict:
        """Get market positioning recommendations."""
        base = self.market_positioning.get(heat_category, {})
        
        # Add variety-specific insights
        variety_insights = {
            "Siling Haba": "High volume, competitive pricing. Focus on freshness and consistency.",
            "Siling Labuyo": "Premium positioning possible. Emphasize authenticity and heat level.",
            "Siling Demonyo": "Niche market. Target specialty buyers and export opportunities."
        }
        
        return {
            **base,
            "variety_insight": variety_insights.get(variety, ""),
            "export_potential": "High" if variety != "Siling Haba" else "Moderate"
        }
    
    def _get_safety_recommendations(self, heat_category: str) -> Dict:
        """Get safety recommendations."""
        precautions = self.safety_precautions.get(heat_category, [])
        
        first_aid = {
            "skin_burn": "Apply vegetable oil, then wash with soap and water",
            "eye_contact": "Flush with saline or clean water for 15 minutes",
            "ingestion": "Drink milk or eat dairy products (not water)",
            "severe_reaction": "Seek medical attention"
        }
        
        return {
            "handling_precautions": precautions,
            "first_aid": first_aid
        }
    
    def _get_harvest_recommendations(self, maturity_stage: str) -> Dict:
        """Get harvest timing recommendations."""
        recommendations = {
            "Immature": {
                "action": "Wait",
                "description": "Not ready for harvest. Continue monitoring.",
                "check_interval": "Every 2-3 days"
            },
            "Developing": {
                "action": "Monitor closely",
                "description": "Approaching maturity. Watch for color changes.",
                "check_interval": "Daily"
            },
            "Mature": {
                "action": "Harvest soon",
                "description": "Optimal harvest window. Best quality in 3-5 days.",
                "check_interval": "Harvest when color is fully developed"
            },
            "Overripe": {
                "action": "Harvest immediately",
                "description": "Past optimal. May be good for seeds or processing.",
                "check_interval": "N/A - harvest now"
            }
        }
        
        return recommendations.get(maturity_stage, {})
    
    def get_culinary_guide(self, heat_category: str) -> Dict:
        """Get detailed culinary guide for a heat level."""
        guides = {
            "Mild": {
                "best_for": ["Everyday cooking", "Family meals", "Beginners"],
                "avoid": ["Extreme spice dishes", "Hot sauce production"],
                "techniques": ["Raw", "Sautéing", "Grilling", "Stuffing"],
                "flavor_profile": "Subtle warmth with fresh, vegetal notes"
            },
            "Medium": {
                "best_for": ["Filipino dishes", "Asian cuisine", "Sauces"],
                "avoid": ["Raw consumption for sensitive palates"],
                "techniques": ["Stir-frying", "Braising", "Sauce making"],
                "flavor_profile": "Balanced heat with fruity undertones"
            },
            "Hot": {
                "best_for": ["Hot sauces", "Spicy condiments", "Specialty dishes"],
                "avoid": ["Large quantities in single dishes"],
                "techniques": ["Drying", "Oil infusion", "Fermentation"],
                "flavor_profile": "Intense heat with complex, lingering burn"
            },
            "Extra Hot": {
                "best_for": ["Extreme hot sauce", "Specialty products", "Challenges"],
                "avoid": ["Direct consumption", "Cooking in enclosed spaces"],
                "techniques": ["Careful extraction", "Controlled dilution"],
                "flavor_profile": "Overwhelming heat, use as accent only"
            }
        }
        
        return guides.get(heat_category, {})
