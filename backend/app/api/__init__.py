"""API routes module."""

from fastapi import APIRouter

from .auth import router as auth_router
from .users import router as users_router
from .samples import router as samples_router
from .images import router as images_router
from .predictions import router as predictions_router
from .recommendations import router as recommendations_router
from .models import router as models_router
from .analytics import router as analytics_router
from .content import router as content_router
from .prices import router as prices_router
from .chat import router as chat_router
from .forum import router as forum_router
from .ml_models import router as ml_models_router
from .hotspots import router as hotspots_router

router = APIRouter()

# Include all route modules
router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
router.include_router(users_router, prefix="/users", tags=["Users"])
router.include_router(samples_router, prefix="/samples", tags=["Chili Samples"])
router.include_router(images_router, prefix="/images", tags=["Images"])
router.include_router(predictions_router, prefix="/predictions", tags=["Predictions"])
router.include_router(recommendations_router, prefix="/recommendations", tags=["Recommendations"])
router.include_router(models_router, prefix="/models", tags=["ML Models"])
router.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
router.include_router(content_router, prefix="/content", tags=["Content"])
router.include_router(prices_router, tags=["Chili Prices"])
router.include_router(chat_router, prefix="/chat", tags=["Chat"])
router.include_router(forum_router, prefix="/forum", tags=["Forum"])
router.include_router(ml_models_router, prefix="/ml", tags=["Trained ML Models"])
router.include_router(hotspots_router, prefix="/hotspots", tags=["Hotspots"])
