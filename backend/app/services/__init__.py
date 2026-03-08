"""Backend Services Module."""

# Lazy imports to avoid loading heavy ML dependencies at startup
# Import these explicitly where needed:
#   from app.services.image_service import ImageService
#   from app.services.analysis_service import AnalysisService
#   from app.services.storage_service import StorageService
#   from app.services.roboflow_service import classify_chili_image

__all__ = ["ImageService", "AnalysisService", "StorageService"]

def __getattr__(name):
    if name == "ImageService":
        from .image_service import ImageService
        return ImageService
    elif name == "AnalysisService":
        from .analysis_service import AnalysisService
        return AnalysisService
    elif name == "StorageService":
        from .storage_service import StorageService
        return StorageService
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
