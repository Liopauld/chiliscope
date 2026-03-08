"""
External Content Routes
=======================

Endpoints for fetching real-time chili-related content from external sources.
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()

# Cache for storing fetched data
_cache = {
    "news": {"data": [], "expires": None},
    "recipes": {"data": [], "expires": None},
    "events": {"data": [], "expires": None}
}

CACHE_DURATION = timedelta(minutes=15)


class NewsArticle(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    source: str
    url: str
    image: Optional[str] = None
    published_at: str


class Recipe(BaseModel):
    id: str
    title: str
    description: str
    prep_time: str
    difficulty: str
    image: Optional[str] = None
    source_url: Optional[str] = None


class Event(BaseModel):
    id: str
    title: str
    location: str
    date: str
    event_type: str
    url: Optional[str] = None


class ContentResponse(BaseModel):
    news: List[NewsArticle]
    recipes: List[Recipe]
    events: List[Event]
    last_updated: str


async def fetch_news_from_api() -> List[NewsArticle]:
    """
    Fetch chili-related news from NewsAPI or similar service.
    In production, you would use a real API key.
    """
    # For now, return curated content
    # In production: Use NewsAPI, Google News API, or web scraping
    
    news_items = [
        {
            "id": "news-1",
            "title": "Philippine Chili Exports Reach Record High in 2025",
            "description": "The Department of Agriculture reports a 40% increase in chili pepper exports, with Bicol region leading production.",
            "source": "Philippine Daily Inquirer",
            "url": "https://newsinfo.inquirer.net/",
            "image": "https://images.unsplash.com/photo-1583119022894-919a68a3d0e3?w=400",
            "published_at": (datetime.utcnow() - timedelta(hours=5)).isoformat()
        },
        {
            "id": "news-2",
            "title": "Capsaicin Shows Promise in Pain Management Research",
            "description": "New study from UP Manila reveals potential therapeutic applications of capsaicin extracted from siling labuyo.",
            "source": "GMA News",
            "url": "https://www.gmanetwork.com/news/",
            "image": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400",
            "published_at": (datetime.utcnow() - timedelta(hours=12)).isoformat()
        },
        {
            "id": "news-3",
            "title": "Urban Farming: Growing Siling Labuyo in Small Spaces",
            "description": "Expert tips on cultivating the beloved Philippine chili in balconies and small gardens.",
            "source": "ABS-CBN News",
            "url": "https://news.abs-cbn.com/",
            "image": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400",
            "published_at": (datetime.utcnow() - timedelta(days=1)).isoformat()
        },
        {
            "id": "news-4",
            "title": "Climate Change Impacts Chili Pepper Harvests in Southeast Asia",
            "description": "Farmers adapt to changing weather patterns affecting traditional growing seasons.",
            "source": "Reuters",
            "url": "https://www.reuters.com/",
            "image": "https://images.unsplash.com/photo-1518977956812-cd3dbadaaf31?w=400",
            "published_at": (datetime.utcnow() - timedelta(days=2)).isoformat()
        },
        {
            "id": "news-5",
            "title": "Hot Sauce Industry Booms as Filipinos Develop Taste for Extreme Heat",
            "description": "Local entrepreneurs capitalize on growing demand for artisanal hot sauces.",
            "source": "Rappler",
            "url": "https://www.rappler.com/",
            "image": "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400",
            "published_at": (datetime.utcnow() - timedelta(days=3)).isoformat()
        }
    ]
    
    return [NewsArticle(**item) for item in news_items]


async def fetch_recipes_from_api() -> List[Recipe]:
    """
    Fetch chili-based recipes.
    In production: Use Spoonacular, Edamam, or Tasty API
    """
    recipes = [
        {
            "id": "recipe-1",
            "title": "Bicol Express",
            "description": "Creamy coconut pork stew with siling labuyo - a Bicolano classic",
            "prep_time": "45 mins",
            "difficulty": "Medium",
            "image": "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400",
            "source_url": "https://panlasangpinoy.com/"
        },
        {
            "id": "recipe-2",
            "title": "Laing",
            "description": "Dried taro leaves cooked in spicy coconut milk with chili peppers",
            "prep_time": "1 hour",
            "difficulty": "Medium",
            "image": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400",
            "source_url": "https://www.kawalingpinoy.com/"
        },
        {
            "id": "recipe-3",
            "title": "Dynamite Lumpia",
            "description": "Cheese-stuffed siling haba wrapped in lumpia wrapper and fried",
            "prep_time": "30 mins",
            "difficulty": "Easy",
            "image": "https://images.unsplash.com/photo-1606525437679-037aca74a3e9?w=400",
            "source_url": "https://www.lutongbahay.ph/"
        },
        {
            "id": "recipe-4",
            "title": "Ginataang Hipon",
            "description": "Shrimp in coconut milk with siling labuyo for that perfect kick",
            "prep_time": "35 mins",
            "difficulty": "Easy",
            "image": "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400",
            "source_url": "https://www.angsarap.net/"
        },
        {
            "id": "recipe-5",
            "title": "Sinigang na Baboy sa Siling Labuyo",
            "description": "A spicy twist on the classic Filipino sour soup",
            "prep_time": "1 hour",
            "difficulty": "Medium",
            "image": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400",
            "source_url": "https://www.foxyfolksy.com/"
        },
        {
            "id": "recipe-6",
            "title": "Chili Garlic Oil (Sawsawan)",
            "description": "Homemade spicy oil perfect as a condiment for any Filipino dish",
            "prep_time": "15 mins",
            "difficulty": "Easy",
            "image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400",
            "source_url": "https://www.pingdesserts.com/"
        }
    ]
    
    return [Recipe(**item) for item in recipes]


async def fetch_events_from_api() -> List[Event]:
    """
    Fetch upcoming chili-related events.
    In production: Use Eventbrite API, Meetup API, or web scraping
    """
    events = [
        {
            "id": "event-1",
            "title": "Philippine Chili Festival 2026",
            "location": "Naga City, Bicol",
            "date": "February 15-17, 2026",
            "event_type": "Festival",
            "url": "https://www.tourism.gov.ph/"
        },
        {
            "id": "event-2",
            "title": "Manila Hot Sauce Competition",
            "location": "SM Mall of Asia, Pasay",
            "date": "March 5, 2026",
            "event_type": "Competition",
            "url": "https://www.eventbrite.com/"
        },
        {
            "id": "event-3",
            "title": "Urban Chili Gardening Workshop",
            "location": "UP Diliman, Quezon City",
            "date": "February 22, 2026",
            "event_type": "Workshop",
            "url": "https://upd.edu.ph/"
        },
        {
            "id": "event-4",
            "title": "Southeast Asian Spice Expo 2026",
            "location": "World Trade Center, Pasay",
            "date": "April 10-12, 2026",
            "event_type": "Expo",
            "url": "https://www.wtcmanila.com.ph/"
        },
        {
            "id": "event-5",
            "title": "Chili Pepper Eating Contest",
            "location": "Legazpi City, Albay",
            "date": "February 28, 2026",
            "event_type": "Competition",
            "url": "https://www.bicoltourism.com/"
        },
        {
            "id": "event-6",
            "title": "Agricultural Innovation Summit",
            "location": "PICC, Manila",
            "date": "March 20-21, 2026",
            "event_type": "Conference",
            "url": "https://www.da.gov.ph/"
        }
    ]
    
    return [Event(**item) for item in events]


def is_cache_valid(cache_key: str) -> bool:
    """Check if cache is still valid."""
    cache_entry = _cache.get(cache_key)
    if not cache_entry or not cache_entry.get("expires"):
        return False
    return datetime.utcnow() < cache_entry["expires"]


@router.get("/content", response_model=ContentResponse)
async def get_all_content():
    """
    Get all real-time content: news, recipes, and events.
    Data is cached for 15 minutes to reduce API calls.
    """
    now = datetime.utcnow()
    
    # Check if we need to refresh any data
    tasks = []
    
    if not is_cache_valid("news"):
        tasks.append(("news", fetch_news_from_api()))
    
    if not is_cache_valid("recipes"):
        tasks.append(("recipes", fetch_recipes_from_api()))
    
    if not is_cache_valid("events"):
        tasks.append(("events", fetch_events_from_api()))
    
    # Fetch data in parallel if needed
    if tasks:
        results = await asyncio.gather(*[task[1] for task in tasks])
        for i, (key, _) in enumerate(tasks):
            _cache[key] = {
                "data": results[i],
                "expires": now + CACHE_DURATION
            }
    
    return ContentResponse(
        news=_cache["news"]["data"] if _cache["news"]["data"] else [],
        recipes=_cache["recipes"]["data"] if _cache["recipes"]["data"] else [],
        events=_cache["events"]["data"] if _cache["events"]["data"] else [],
        last_updated=now.isoformat()
    )


@router.get("/news", response_model=List[NewsArticle])
async def get_news(
    limit: int = Query(default=5, ge=1, le=20, description="Number of news articles to return")
):
    """Get latest chili-related news articles."""
    if not is_cache_valid("news"):
        _cache["news"] = {
            "data": await fetch_news_from_api(),
            "expires": datetime.utcnow() + CACHE_DURATION
        }
    
    return _cache["news"]["data"][:limit]


@router.get("/recipes", response_model=List[Recipe])
async def get_recipes(
    limit: int = Query(default=6, ge=1, le=20, description="Number of recipes to return")
):
    """Get trending chili-based recipes."""
    if not is_cache_valid("recipes"):
        _cache["recipes"] = {
            "data": await fetch_recipes_from_api(),
            "expires": datetime.utcnow() + CACHE_DURATION
        }
    
    return _cache["recipes"]["data"][:limit]


@router.get("/events", response_model=List[Event])
async def get_events(
    limit: int = Query(default=6, ge=1, le=20, description="Number of events to return")
):
    """Get upcoming chili-related events."""
    if not is_cache_valid("events"):
        _cache["events"] = {
            "data": await fetch_events_from_api(),
            "expires": datetime.utcnow() + CACHE_DURATION
        }
    
    return _cache["events"]["data"][:limit]
