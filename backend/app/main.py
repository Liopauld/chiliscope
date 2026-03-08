"""
ChiliScope - Main Application
====================================================

FastAPI application entry point with CORS, middleware, and route configuration.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
import time

from app.core.config import settings
from app.core.database import MongoDB
from app.api import router as api_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown events.
    """
    # Startup
    logger.info("Starting Chili Morphology Analyzer API...")
    await MongoDB.connect()

    # Initialise Firebase Admin SDK (non-fatal if credentials are missing)
    try:
        from app.services.firebase_service import init_firebase
        init_firebase()
    except Exception as exc:
        logger.warning("Firebase Admin SDK init skipped: %s", exc)

    logger.info("Application started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    await MongoDB.disconnect()
    logger.info("Application shutdown complete")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="""
    ## 🌶️ ChiliScope API
    
    A machine learning-powered API for analyzing chili flower morphology 
    and predicting fruit heat levels.
    
    ### Features
    - **Image Analysis**: Upload and analyze chili flower/pod images
    - **Variety Classification**: CNN-based classification of Philippine chili varieties
    - **Heat Level Prediction**: Predict Scoville Heat Units (SHU)
    - **Maturity Assessment**: Determine harvest readiness
    - **Recommendations**: Get culinary and market recommendations
    
    ### Supported Varieties
    - Siling Haba (Long Green Chili)
    - Siling Labuyo (Bird's Eye Chili)
    - Siling Demonyo (Demon Chili)
    """,
    version=settings.app_version,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time header to all responses."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2))
    return response


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Log all incoming requests."""
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    return response


# Include API router
app.include_router(api_router, prefix=settings.api_v1_prefix)


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with API information."""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": "/api/docs",
        "status": "running"
    }


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "database": "connected" if MongoDB.database is not None else "disconnected"
    }


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle unhandled exceptions globally."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal server error occurred",
            "type": type(exc).__name__
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
