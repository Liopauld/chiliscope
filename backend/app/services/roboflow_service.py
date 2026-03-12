"""
Roboflow Integration Service
============================

Service for chili classification using Roboflow hosted or local inference.

HOSTED vs LOCAL INFERENCE:
--------------------------
1. HOSTED API (Recommended for most cases):
   - Pros: No GPU needed, always up-to-date model, easy setup
   - Cons: Requires internet, API rate limits, ~100-500ms latency
   - Cost: Free tier available (1000 API calls/month)
   - Setup: Just need API key from roboflow.com

2. LOCAL INFERENCE (For production/offline):
   - Pros: No internet needed, faster (<50ms), unlimited calls
   - Cons: Requires Python packages, model download, more RAM
   - Setup: pip install inference-sdk

SETUP INSTRUCTIONS:
-------------------
1. Go to https://roboflow.com and sign in
2. Navigate to your project -> Settings -> API Key
3. Copy your API key and add to .env:
   ROBOFLOW_API_KEY=your_api_key_here
   ROBOFLOW_PROJECT_ID=your_project_name
   ROBOFLOW_MODEL_VERSION=1
   ROBOFLOW_USE_HOSTED=true
"""

import base64
import logging
from typing import Optional, Dict, Any
from pathlib import Path
import httpx
from PIL import Image, ImageOps
import io

from ..core.config import settings

logger = logging.getLogger(__name__)


class RoboflowClassifier:
    """
    Roboflow model integration for chili classification.
    Supports both hosted API and local inference.
    """
    
    def __init__(self):
        self.api_key = settings.roboflow_api_key
        self.project_id = settings.roboflow_project_id
        self.model_version = settings.roboflow_model_version
        self.use_hosted = settings.roboflow_use_hosted
        self._local_model = None
        
        # Roboflow API base URL (serverless for classification models)
        self.api_base = "https://serverless.roboflow.com"
        
    @property
    def is_configured(self) -> bool:
        """Check if Roboflow is properly configured."""
        return bool(self.api_key and self.project_id)
    
    @staticmethod
    def preprocess_image(image: Image.Image, max_dim: int = 640) -> Image.Image:
        """
        Preprocess image for Roboflow classification:
        1. Apply EXIF orientation (critical for mobile photos)
        2. Convert to RGB
        3. Resize to max_dim while preserving aspect ratio
        """
        # Apply EXIF orientation — mobile cameras store rotation in EXIF metadata
        # PIL does NOT auto-apply this, so photos taken in portrait appear sideways
        try:
            image = ImageOps.exif_transpose(image)
        except Exception:
            pass  # Some images have no/bad EXIF — ignore

        # Ensure RGB
        if image.mode != "RGB":
            image = image.convert("RGB")

        # Resize if larger than max_dim (classification models don't need 4000x3000)
        if max(image.size) > max_dim:
            image = image.copy()
            image.thumbnail((max_dim, max_dim), Image.LANCZOS)
            logger.debug(f"Resized image to {image.size} for classification")

        return image

    def _image_to_base64(self, image: Image.Image) -> str:
        """Convert PIL Image to base64 string."""
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")
    
    async def predict_hosted(self, image: Image.Image, model_version: Optional[str] = None) -> Dict[str, Any]:
        """
        Run prediction using Roboflow hosted API.
        
        Args:
            image: PIL Image to classify
            model_version: Optional version override (e.g. "6" to use v6 instead of default)
            
        Returns:
            Dict with predictions including class, confidence, etc.
        """
        if not self.is_configured:
            raise ValueError("Roboflow API key and project ID required")
        
        # Preprocess: EXIF transpose + resize (fixes mobile photo rotation)
        image = self.preprocess_image(image)
        logger.info(f"Sending image to Roboflow: {image.size[0]}x{image.size[1]}")
        
        # Convert image to base64
        image_b64 = self._image_to_base64(image)
        
        # Build API URL (use override version if provided)
        version = model_version or self.model_version
        url = f"{self.api_base}/{self.project_id}/{version}"
        logger.info(f"Using Roboflow model version: {version}")
        params = {
            "api_key": self.api_key,
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    params=params,
                    data=image_b64,
                    headers={"Content-Type": "application/x-www-form-urlencoded"}
                )
                response.raise_for_status()
                result = response.json()
                
                logger.info(f"Roboflow prediction: {result}")
                return self._parse_response(result)
                
        except httpx.HTTPError as e:
            logger.error(f"Roboflow API error: {e}")
            raise RuntimeError(f"Roboflow API error: {str(e)}")
    
    def predict_local(self, image: Image.Image) -> Dict[str, Any]:
        """
        Run prediction using local inference (requires inference-sdk).
        
        To enable local inference:
        1. pip install inference-sdk
        2. Set ROBOFLOW_USE_HOSTED=false in .env
        
        Args:
            image: PIL Image to classify
            
        Returns:
            Dict with predictions
        """
        try:
            # Lazy import - only load if using local inference
            from inference_sdk import InferenceHTTPClient
            
            # Preprocess: EXIF transpose + resize
            image = self.preprocess_image(image)
            
            if self._local_model is None:
                self._local_model = InferenceHTTPClient(
                    api_url="https://serverless.roboflow.com",
                    api_key=self.api_key
                )
            
            # Save image temporarily
            buffer = io.BytesIO()
            image.save(buffer, format="JPEG")
            buffer.seek(0)
            
            result = self._local_model.infer(
                buffer,
                model_id=f"{self.project_id}/{self.model_version}"
            )
            
            return self._parse_response(result)
            
        except ImportError:
            raise RuntimeError(
                "Local inference requires inference-sdk. "
                "Install with: pip install inference-sdk"
            )
    
    def _parse_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse Roboflow response into standardized format.
        
        Handles classification responses in both list and dict format,
        as well as object detection responses.
        """
        result = {
            "success": True,
            "predictions": [],
            "top_prediction": None,
            "confidence": 0.0,
            "raw_response": response
        }
        
        # Handle classification response
        if "predictions" in response:
            predictions = response["predictions"]
            
            # LIST format: {"predictions": [{"class": "siling_labuyo", "confidence": 0.95}]}
            if isinstance(predictions, list) and len(predictions) > 0:
                sorted_preds = sorted(
                    predictions, 
                    key=lambda x: x.get("confidence", 0), 
                    reverse=True
                )
                
                result["predictions"] = [
                    {
                        "class": p.get("class", "unknown"),
                        "confidence": p.get("confidence", 0),
                    }
                    for p in sorted_preds
                ]
                
                top = sorted_preds[0]
                result["top_prediction"] = top.get("class", "unknown")
                result["confidence"] = top.get("confidence", 0)
            
            # DICT format: {"predictions": {"siling-labuyo": {"confidence": 0.9}, ...}}
            elif isinstance(predictions, dict) and len(predictions) > 0:
                logger.info("Roboflow returned dict-format predictions")
                pred_list = [
                    {"class": cls_name, "confidence": cls_data.get("confidence", 0) if isinstance(cls_data, dict) else float(cls_data)}
                    for cls_name, cls_data in predictions.items()
                ]
                sorted_preds = sorted(pred_list, key=lambda x: x["confidence"], reverse=True)
                result["predictions"] = sorted_preds
                if sorted_preds:
                    result["top_prediction"] = sorted_preds[0]["class"]
                    result["confidence"] = sorted_preds[0]["confidence"]
        
        # Handle object detection response (if bounding boxes present)
        elif "detections" in response:
            detections = response["detections"]
            if detections:
                sorted_dets = sorted(
                    detections,
                    key=lambda x: x.get("confidence", 0),
                    reverse=True
                )
                
                result["predictions"] = [
                    {
                        "class": d.get("class", "unknown"),
                        "confidence": d.get("confidence", 0),
                        "bbox": {
                            "x": d.get("x", 0),
                            "y": d.get("y", 0),
                            "width": d.get("width", 0),
                            "height": d.get("height", 0),
                        }
                    }
                    for d in sorted_dets
                ]
                
                top = sorted_dets[0]
                result["top_prediction"] = top.get("class", "unknown")
                result["confidence"] = top.get("confidence", 0)
        
        # ── Fallback: use the root-level "top" and "confidence" fields ──
        # Roboflow classification responses include these at the root.
        # If our parsing above yielded nothing, use them directly.
        if not result["top_prediction"] and response.get("top"):
            logger.info(f"Using root-level 'top' fallback: {response['top']}")
            result["top_prediction"] = response["top"]
            result["confidence"] = response.get("confidence", 0.0)
            if not result["predictions"]:
                result["predictions"] = [
                    {"class": response["top"], "confidence": response.get("confidence", 0.0)}
                ]
        
        return result
    
    async def predict(self, image: Image.Image, model_version: Optional[str] = None) -> Dict[str, Any]:
        """
        Run prediction using configured method (hosted or local).
        
        Args:
            image: PIL Image to classify
            model_version: Optional version override
            
        Returns:
            Standardized prediction result
        """
        if self.use_hosted:
            return await self.predict_hosted(image, model_version=model_version)
        else:
            return self.predict_local(image)
    
    def map_to_variety(self, prediction_class: str) -> str:
        """
        Map Roboflow class names to standard variety names.
        
        Customize this based on your Roboflow model's class names.
        """
        mapping = {
            # Siling Haba variants
            "siling_haba": "Siling Haba",
            "siling-haba": "Siling Haba",
            "silinghaba": "Siling Haba",
            "siling haba": "Siling Haba",
            "finger_chili": "Siling Haba",
            "finger-chili": "Siling Haba",
            "finger chili": "Siling Haba",
            "haba": "Siling Haba",
            "siling-haba-pod": "Siling Haba",
            "siling_haba_pod": "Siling Haba",
            
            # Siling Labuyo variants
            "siling_labuyo": "Siling Labuyo",
            "siling-labuyo": "Siling Labuyo",
            "silinglabuyo": "Siling Labuyo",
            "siling labuyo": "Siling Labuyo",
            "birds_eye": "Siling Labuyo",
            "bird_eye": "Siling Labuyo",
            "birds-eye": "Siling Labuyo",
            "bird-eye": "Siling Labuyo",
            "labuyo": "Siling Labuyo",
            "siling-labuyo-pod": "Siling Labuyo",
            "siling_labuyo_pod": "Siling Labuyo",
            
            # Siling Demonyo variants
            "super_labuyo": "Siling Demonyo",
            "super-labuyo": "Siling Demonyo",
            "superlabuyo": "Siling Demonyo",
            "super labuyo": "Siling Demonyo",
            "siling_demonyo": "Siling Demonyo",
            "siling-demonyo": "Siling Demonyo",
            "silingdemonyo": "Siling Demonyo",
            "siling demonyo": "Siling Demonyo",
            "demonyo": "Siling Demonyo",
            "demon_chili": "Siling Demonyo",
            "demon-chili": "Siling Demonyo",
            "demon chili": "Siling Demonyo",
            "siling-demonyo-pod": "Siling Demonyo",
            "siling_demonyo_pod": "Siling Demonyo",
            
            # Others (non-chili)
            "others": "Others",
            "other": "Others",
            "unknown": "Others",
        }
        
        # Normalize the class name
        normalized = prediction_class.lower().strip()
        
        matched = mapping.get(normalized)
        if matched:
            return matched
        
        # Fuzzy fallback: check if any key is contained in the class name
        for key, variety in mapping.items():
            if key in normalized or normalized in key:
                logger.info(f"Fuzzy matched '{prediction_class}' -> '{variety}' via key '{key}'")
                return variety
        
        logger.warning(f"Unknown class from Roboflow: '{prediction_class}' (normalized: '{normalized}')")
        return prediction_class.title()


# Global instance
roboflow_classifier = RoboflowClassifier()


class ChiliSegmenter:
    """
    Roboflow chili pod instance segmentation model.

    Model: chili-segmentation-pl3my/7
    Classes: siling-demonyo-pod, siling-haba-pod, siling-labuyo-pod

    This model detects AND classifies multiple chili pods in a single image,
    returning per-pod bounding boxes / masks together with variety labels.
    """

    # ── Average reference measurements (sourced from published data) ──
    # Used to give users context on how the detected pod compares to the
    # typical size of that variety.
    VARIETY_REFERENCE: Dict[str, Dict[str, Any]] = {
        "siling-haba-pod": {
            "variety_name": "Siling Haba",
            "avg_length_mm": 90.0,    # 70-120 mm typical
            "avg_width_mm": 12.0,     # 10-15 mm
            "avg_weight_g": 12.0,     # 8-20 g
            "shu_range": "500 – 15,000",
            "heat_category": "Mild to Medium",
            "description": "Long finger chili, common in Filipino cooking",
        },
        "siling-labuyo-pod": {
            "variety_name": "Siling Labuyo",
            "avg_length_mm": 27.0,    # 20-35 mm
            "avg_width_mm": 6.0,      # 5-8 mm
            "avg_weight_g": 2.0,      # 1-3 g
            "shu_range": "80,000 – 100,000",
            "heat_category": "Very Hot",
            "description": "Small bird's-eye chili, very hot",
        },
        "siling-demonyo-pod": {
            "variety_name": "Siling Demonyo",
            "avg_length_mm": 22.0,    # 15-30 mm
            "avg_width_mm": 8.0,      # 6-10 mm
            "avg_weight_g": 2.5,      # 1-4 g
            "shu_range": "100,000 – 225,000",
            "heat_category": "Extra Hot",
            "description": "Super-hot Philippine chili, hotter than Labuyo",
        },
    }

    def __init__(self):
        self.api_key = settings.roboflow_chili_segmentation_api_key or settings.roboflow_api_key
        self.project_id = settings.roboflow_chili_segmentation_project_id
        self.model_version = settings.roboflow_chili_segmentation_model_version
        self.api_base = "https://serverless.roboflow.com"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.project_id)

    def _image_to_base64(self, image: Image.Image) -> str:
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    # ── Main entry point ──────────────────────────────────────────────
    async def segment(self, image: Image.Image) -> Dict[str, Any]:
        """
        Segment & classify all chili pods in an image.

        Returns a rich result dict containing:
        - segments[]: per-pod class, confidence, bbox, measurement, variety info
        - varieties_detected: grouped summary by variety
        - measurements: aggregated stats
        """
        if not self.is_configured:
            return {"success": False, "error": "Chili segmentation model not configured"}

        image_b64 = self._image_to_base64(image)
        url = f"{self.api_base}/{self.project_id}/{self.model_version}"
        params = {"api_key": self.api_key}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    params=params,
                    data=image_b64,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                response.raise_for_status()
                raw = response.json()
                logger.info(f"Chili segmentation raw keys: {list(raw.keys())}")
                return self._parse_chili_segmentation(raw)

        except httpx.HTTPError as e:
            logger.error(f"Chili segmentation API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Chili segmentation error: {e}")
            return {"success": False, "error": str(e)}

    # ── Map raw class label → human-friendly variety name ──────────
    def map_class_to_variety(self, raw_class: str) -> str:
        mapping = {
            "siling-haba-pod": "Siling Haba",
            "siling-labuyo-pod": "Siling Labuyo",
            "siling-demonyo-pod": "Siling Demonyo",
            # Possible underscored variants
            "siling_haba_pod": "Siling Haba",
            "siling_labuyo_pod": "Siling Labuyo",
            "siling_demonyo_pod": "Siling Demonyo",
        }
        return mapping.get(raw_class.lower().strip(), raw_class.title())

    # ── Parse the Roboflow response ───────────────────────────────
    def _parse_chili_segmentation(self, response: Dict[str, Any]) -> Dict[str, Any]:
        import math

        image_info = response.get("image", {})
        img_w = image_info.get("width", 0)
        img_h = image_info.get("height", 0)

        result: Dict[str, Any] = {
            "success": True,
            "segments": [],
            "total_detected": 0,
            "image_width": img_w,
            "image_height": img_h,
            "varieties_detected": {},
            "measurements": None,
        }

        predictions = response.get("predictions", [])
        if not predictions:
            return result

        # ──────────────────────────────────────────────────────────
        # STEP 1 — Calibrate mm_per_px using the known average
        #          dimensions of the detected variety.
        #
        # Strategy:
        #   For each detection whose class has a known reference we
        #   compute two candidate scales:
        #     scale_length = ref_length / max(bbox_w, bbox_h)
        #     scale_width  = ref_width  / min(bbox_w, bbox_h)
        #   We weight each candidate by the detection confidence so
        #   that high-confidence detections dominate calibration.
        #   The final mm_per_px is the weighted average of ALL
        #   candidates.  This makes multi-variety images more
        #   accurate because every identified pod contributes to
        #   the shared pixel-scale.
        # ──────────────────────────────────────────────────────────
        scale_candidates: list[tuple[float, float]] = []  # (mm_per_px, weight)

        for pred in predictions:
            raw_class = pred.get("class", "unknown").lower().strip()
            ref = self.VARIETY_REFERENCE.get(raw_class, {})
            if not ref:
                continue

            bbox_w_px = pred.get("width", 0)
            bbox_h_px = pred.get("height", 0)
            conf = pred.get("confidence", 0)
            if bbox_w_px <= 0 or bbox_h_px <= 0 or conf <= 0:
                continue

            long_px = max(bbox_w_px, bbox_h_px)
            short_px = min(bbox_w_px, bbox_h_px)

            ref_length = ref["avg_length_mm"]
            ref_width = ref["avg_width_mm"]

            scale_from_length = ref_length / long_px
            scale_from_width = ref_width / short_px

            # Average both axes for a more stable estimate, weight by
            # confidence so uncertain detections affect calibration less
            avg_scale = (scale_from_length + scale_from_width) / 2.0
            scale_candidates.append((avg_scale, conf))

        # Compute weighted-average mm_per_px
        if scale_candidates:
            total_weight = sum(w for _, w in scale_candidates)
            mm_per_px = sum(s * w for s, w in scale_candidates) / total_weight
            scale_method = "reference-calibrated"
            scale_note = (
                "Scale calibrated from known average dimensions of the detected "
                "variety/varieties. Each pod's pixel size is compared to the "
                "published average for its species to derive the pixel-to-mm "
                "ratio, weighted by detection confidence."
            )
        elif img_w > 0 and img_h > 0:
            # Fallback — no recognized class with reference data
            mm_per_px = 200.0 / max(img_w, img_h)
            scale_method = "image-heuristic"
            scale_note = (
                "No recognized variety reference available; estimated assuming "
                "longest image edge ≈ 20 cm. For better accuracy, include a "
                "known chili variety or reference object."
            )
        else:
            mm_per_px = 1.0
            scale_method = "pixel-raw"
            scale_note = "Could not determine image dimensions; measurements are in pixels."

        # ──────────────────────────────────────────────────────────
        # STEP 2 — Measure every pod using the calibrated scale
        # ──────────────────────────────────────────────────────────
        all_measurements = []
        variety_groups: Dict[str, list] = {}

        for idx, pred in enumerate(predictions, start=1):
            raw_class = pred.get("class", "unknown")
            variety_name = self.map_class_to_variety(raw_class)
            confidence = pred.get("confidence", 0)

            bbox_w_px = pred.get("width", 0)
            bbox_h_px = pred.get("height", 0)

            length_mm = round(max(bbox_w_px, bbox_h_px) * mm_per_px, 1)
            width_mm = round(min(bbox_w_px, bbox_h_px) * mm_per_px, 1)
            area_px = bbox_w_px * bbox_h_px

            # Polygon area if segmentation mask points exist
            poly_area_px = area_px
            if "points" in pred and len(pred["points"]) >= 3:
                pts = pred["points"]
                n = len(pts)
                poly_area_px = abs(
                    sum(
                        pts[i]["x"] * pts[(i + 1) % n]["y"]
                        - pts[(i + 1) % n]["x"] * pts[i]["y"]
                        for i in range(n)
                    )
                ) / 2.0

            area_mm2 = round(poly_area_px * (mm_per_px ** 2), 1)

            # Weight estimation (cylinder-proxy model)
            volume_mm3 = (math.pi / 4) * (width_mm ** 2) * length_mm
            density_factor = 0.00065
            estimated_weight_g = round(volume_mm3 * density_factor, 2)

            # Reference data for this variety
            ref = self.VARIETY_REFERENCE.get(raw_class.lower().strip(), {})

            measurement = {
                "length_mm": length_mm,
                "width_mm": width_mm,
                "area_mm2": area_mm2,
                "estimated_weight_g": estimated_weight_g,
            }

            segment = {
                "pod_number": idx,
                "raw_class": raw_class,
                "variety": variety_name,
                "confidence": confidence,
                "x": pred.get("x", 0),
                "y": pred.get("y", 0),
                "width": pred.get("width", 0),
                "height": pred.get("height", 0),
                "measurement": measurement,
                "reference": {
                    "avg_length_mm": ref.get("avg_length_mm"),
                    "avg_width_mm": ref.get("avg_width_mm"),
                    "avg_weight_g": ref.get("avg_weight_g"),
                    "shu_range": ref.get("shu_range"),
                    "heat_category": ref.get("heat_category"),
                    "description": ref.get("description"),
                } if ref else None,
            }
            if "points" in pred:
                segment["points"] = pred["points"]

            result["segments"].append(segment)
            all_measurements.append(measurement)

            # Group by variety
            if variety_name not in variety_groups:
                variety_groups[variety_name] = []
            variety_groups[variety_name].append(segment)

        result["total_detected"] = len(result["segments"])

        # Build per-variety summaries
        varieties_detected = {}
        for vname, segs in variety_groups.items():
            count = len(segs)
            avg_len = round(sum(s["measurement"]["length_mm"] for s in segs) / count, 1)
            avg_wid = round(sum(s["measurement"]["width_mm"] for s in segs) / count, 1)
            avg_wt = round(sum(s["measurement"]["estimated_weight_g"] for s in segs) / count, 2)
            total_wt = round(sum(s["measurement"]["estimated_weight_g"] for s in segs), 2)
            avg_conf = round(sum(s["confidence"] for s in segs) / count, 4)

            # Look up reference by any segment's raw_class
            raw_key = segs[0]["raw_class"].lower().strip()
            ref = self.VARIETY_REFERENCE.get(raw_key, {})

            varieties_detected[vname] = {
                "count": count,
                "avg_confidence": avg_conf,
                "avg_length_mm": avg_len,
                "avg_width_mm": avg_wid,
                "avg_weight_g": avg_wt,
                "total_weight_g": total_wt,
                "reference_length_mm": ref.get("avg_length_mm"),
                "reference_width_mm": ref.get("avg_width_mm"),
                "reference_weight_g": ref.get("avg_weight_g"),
                "shu_range": ref.get("shu_range"),
                "heat_category": ref.get("heat_category"),
                "description": ref.get("description"),
                "pod_indices": [s["pod_number"] for s in segs],
            }

        result["varieties_detected"] = varieties_detected

        # Aggregate measurements
        if all_measurements:
            n = len(all_measurements)
            result["measurements"] = {
                "scale_mm_per_px": round(mm_per_px, 4),
                "scale_method": scale_method,
                "scale_note": scale_note,
                "per_pod": all_measurements,
                "average": {
                    "length_mm": round(sum(m["length_mm"] for m in all_measurements) / n, 1),
                    "width_mm": round(sum(m["width_mm"] for m in all_measurements) / n, 1),
                    "area_mm2": round(sum(m["area_mm2"] for m in all_measurements) / n, 1),
                    "estimated_weight_g": round(sum(m["estimated_weight_g"] for m in all_measurements) / n, 2),
                },
                "total_pods": n,
                "total_estimated_weight_g": round(sum(m["estimated_weight_g"] for m in all_measurements), 2),
            }

        return result


# ── Legacy flower segmenter (kept for backward compatibility) ─────────
class RoboflowSegmenter:
    """
    Flower segmentation model (flower-segmentation-brl0m/5).
    Detects flower / pod regions. When a pod is detected the known average
    pod dimensions are used to calibrate the pixel scale; when only flowers
    are detected a typical flower diameter (~8-12 mm) is used instead.
    """

    # Reference sizes used for pixel-scale calibration
    FLOWER_REFERENCE_MM = 10.0  # avg chili flower diameter ≈ 10 mm
    POD_REFERENCE: Dict[str, Dict[str, float]] = {
        "pod": {"avg_length_mm": 50.0, "avg_width_mm": 10.0},
        "chili_pod": {"avg_length_mm": 50.0, "avg_width_mm": 10.0},
        "chili-pod": {"avg_length_mm": 50.0, "avg_width_mm": 10.0},
    }

    def __init__(self):
        self.api_key = settings.roboflow_api_key
        self.project_id = settings.roboflow_segmentation_project_id
        self.model_version = settings.roboflow_segmentation_model_version
        self.api_base = "https://serverless.roboflow.com"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.project_id)

    def _image_to_base64(self, image: Image.Image) -> str:
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    async def segment(self, image: Image.Image) -> Dict[str, Any]:
        """Run flower/pod segmentation with reference-calibrated measurements."""
        if not self.is_configured:
            return {"success": False, "error": "Flower segmentation model not configured"}

        image_b64 = self._image_to_base64(image)
        url = f"{self.api_base}/{self.project_id}/{self.model_version}"
        params = {"api_key": self.api_key}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    params=params,
                    data=image_b64,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                response.raise_for_status()
                raw = response.json()
                return self._parse_flower_segmentation(raw)
        except Exception as e:
            logger.error(f"Flower segmentation error: {e}")
            return {"success": False, "error": str(e)}

    def _parse_flower_segmentation(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """Parse flower segmentation with reference-calibrated scale."""
        import math

        image_info = response.get("image", {})
        img_w = image_info.get("width", 0)
        img_h = image_info.get("height", 0)

        predictions = response.get("predictions", [])

        # ── Calibrate scale from detected objects ──────────────────
        # If pods are found, use known pod dimensions.
        # If only flowers, use the typical flower diameter.
        scale_candidates: list[tuple[float, float]] = []

        for pred in predictions:
            cls = pred.get("class", "").lower().strip()
            bbox_w = pred.get("width", 0)
            bbox_h = pred.get("height", 0)
            conf = pred.get("confidence", 0)
            if bbox_w <= 0 or bbox_h <= 0 or conf <= 0:
                continue

            long_px = max(bbox_w, bbox_h)
            short_px = min(bbox_w, bbox_h)

            pod_ref = self.POD_REFERENCE.get(cls)
            if pod_ref:
                s_len = pod_ref["avg_length_mm"] / long_px
                s_wid = pod_ref["avg_width_mm"] / short_px
                scale_candidates.append(((s_len + s_wid) / 2.0, conf))
            elif "flower" in cls:
                # Flowers are roughly circular; use the shorter axis
                # as the diameter proxy
                s = self.FLOWER_REFERENCE_MM / short_px
                scale_candidates.append((s, conf))

        if scale_candidates:
            total_w = sum(w for _, w in scale_candidates)
            mm_per_px = sum(s * w for s, w in scale_candidates) / total_w
            scale_method = "reference-calibrated"
            scale_note = (
                "Scale calibrated from the known average size of detected "
                "flowers/pods. Pixel dimensions are compared to published "
                "reference measurements, weighted by detection confidence."
            )
        elif img_w > 0 and img_h > 0:
            mm_per_px = 200.0 / max(img_w, img_h)
            scale_method = "image-heuristic"
            scale_note = (
                "No recognized reference object found; estimated assuming "
                "longest image edge ≈ 20 cm."
            )
        else:
            mm_per_px = 1.0
            scale_method = "pixel-raw"
            scale_note = "Could not determine image dimensions."

        # ── Measure each segment ──────────────────────────────────
        segments = []
        pod_measurements = []

        for pred in predictions:
            bbox_w = pred.get("width", 0)
            bbox_h = pred.get("height", 0)

            length_mm = round(max(bbox_w, bbox_h) * mm_per_px, 1)
            width_mm = round(min(bbox_w, bbox_h) * mm_per_px, 1)
            area_px = bbox_w * bbox_h

            poly_area_px = area_px
            if "points" in pred and len(pred["points"]) >= 3:
                pts = pred["points"]
                n = len(pts)
                poly_area_px = abs(
                    sum(
                        pts[i]["x"] * pts[(i + 1) % n]["y"]
                        - pts[(i + 1) % n]["x"] * pts[i]["y"]
                        for i in range(n)
                    )
                ) / 2.0
            area_mm2 = round(poly_area_px * (mm_per_px ** 2), 1)

            volume_mm3 = (math.pi / 4) * (width_mm ** 2) * length_mm
            estimated_weight_g = round(volume_mm3 * 0.00065, 2)

            measurement = {
                "length_mm": length_mm,
                "width_mm": width_mm,
                "area_mm2": area_mm2,
                "estimated_weight_g": estimated_weight_g,
            }

            seg = {
                "class": pred.get("class", "unknown"),
                "confidence": pred.get("confidence", 0),
                "x": pred.get("x", 0),
                "y": pred.get("y", 0),
                "width": bbox_w,
                "height": bbox_h,
                "measurement": measurement,
            }
            if "points" in pred:
                seg["points"] = pred["points"]

            segments.append(seg)
            pod_measurements.append(measurement)

        result: Dict[str, Any] = {
            "success": True,
            "segments": segments,
            "total_detected": len(segments),
            "image_width": img_w,
            "image_height": img_h,
            "measurements": None,
        }

        if pod_measurements:
            n = len(pod_measurements)
            result["measurements"] = {
                "scale_mm_per_px": round(mm_per_px, 4),
                "scale_method": scale_method,
                "scale_note": scale_note,
                "per_pod": pod_measurements,
                "average": {
                    "length_mm": round(sum(m["length_mm"] for m in pod_measurements) / n, 1),
                    "width_mm": round(sum(m["width_mm"] for m in pod_measurements) / n, 1),
                    "area_mm2": round(sum(m["area_mm2"] for m in pod_measurements) / n, 1),
                    "estimated_weight_g": round(sum(m["estimated_weight_g"] for m in pod_measurements) / n, 2),
                },
                "total_pods": n,
                "total_estimated_weight_g": round(sum(m["estimated_weight_g"] for m in pod_measurements), 2),
            }

        return result


class ChiliMaturityClassifier:
    """
    Roboflow maturity classification model.

    Model: chili-maturity-classifier/1
    Classes: immature_green (921), overripe (455), mature_red (303), turning_orange (234)

    Classifies chili peppers by physical maturity stage then maps the result
    to a **variety-aware ripeness** — because different chili varieties are
    harvested at different stages:
      • Siling Labuyo / Demonyo → harvested RED  (mature_red = Ripe)
      • Siling Haba             → harvested GREEN (immature_green = Ripe)
    """

    # ── Alias map — normalise whatever the model returns ─────────────
    _CLASS_ALIASES: Dict[str, str] = {
        # canonical keys (actual model output classes)
        "immature_green": "immature_green",
        "turning_orange": "turning_orange",
        "mature_red": "mature_red",
        "overripe": "overripe",
        # common variations
        "immature-green": "immature_green",
        "immature green": "immature_green",
        "immature": "immature_green",
        "green": "immature_green",
        "unripe": "immature_green",
        "turning-orange": "turning_orange",
        "turning_orange": "turning_orange",
        "turning orange": "turning_orange",
        "turning": "turning_orange",
        "breaker": "turning_orange",
        "semiripe": "turning_orange",
        "semi_ripe": "turning_orange",
        "semi-ripe": "turning_orange",
        "mature-red": "mature_red",
        "mature red": "mature_red",
        "red": "mature_red",
        "ripe": "mature_red",
        "mature": "mature_red",
        "over_ripe": "overripe",
        "over-ripe": "overripe",
        "over ripe": "overripe",
        "overripe": "overripe",
        "dried": "overripe",
    }

    # ── Variety-aware maturity knowledge base ────────────────────────
    # Structure: VARIETY  →  raw_class  →  ripeness info
    VARIETY_MATURITY_MAP: Dict[str, Dict[str, Dict[str, Any]]] = {
        # ─── Siling Labuyo (hot pepper, harvested RED) ───────────────
        "Siling Labuyo": {
            "immature_green": {
                "ripeness": "Unripe",
                "description": "This Siling Labuyo pod is still green and immature. It needs more time on the plant to develop its signature heat.",
                "days_to_harvest": 20,
                "spice_estimate": "Very Low — capsaicin production has barely started.",
                "shu_modifier": 0.15,
                "growth_advice": [
                    "Continue regular watering — keep soil evenly moist but not waterlogged.",
                    "Ensure the plant gets 6–8 hours of direct sunlight daily.",
                    "Apply a balanced NPK fertilizer to promote pod development.",
                    "Do NOT harvest yet — Labuyo needs to turn red for full heat.",
                    "Monitor for aphids and leaf miners at this stage.",
                ],
            },
            "turning_orange": {
                "ripeness": "Turning",
                "description": "This Siling Labuyo is turning orange — capsaicin is building rapidly as it nears full maturity.",
                "days_to_harvest": 5,
                "spice_estimate": "Moderate to High — capsaicin is accumulating quickly.",
                "shu_modifier": 0.65,
                "growth_advice": [
                    "Almost there! Reduce watering slightly to concentrate capsaicin and sugars.",
                    "Can be harvested now for a moderately spicy, slightly tangy flavor.",
                    "For maximum Labuyo heat, wait until the pod turns fully red.",
                    "Avoid heavy fertilization — it can slow final ripening.",
                    "Check for blossom-end rot (dark spots at the tip).",
                ],
            },
            "mature_red": {
                "ripeness": "Ripe",
                "description": "This Siling Labuyo is fully mature and vibrant red — peak heat and flavor!",
                "days_to_harvest": 0,
                "spice_estimate": "Full — capsaicin concentration is at its maximum.",
                "shu_modifier": 1.0,
                "growth_advice": [
                    "Harvest now! The pod is at peak heat and flavor.",
                    "Use sharp scissors to cut the stem — don't pull.",
                    "Leaving ripe pods too long slows new fruit production.",
                    "Dry or freeze harvested chilis to preserve them.",
                    "After harvesting, add compost for the next fruiting cycle.",
                ],
            },
            "overripe": {
                "ripeness": "Over-Ripe",
                "description": "This Siling Labuyo is past its prime — color is darkening and the pod is starting to shrivel or soften.",
                "days_to_harvest": 0,
                "spice_estimate": "Declining — capsaicin starts degrading in overripe pods.",
                "shu_modifier": 0.85,
                "growth_advice": [
                    "Harvest immediately — quality is declining.",
                    "Still usable for drying into chili flakes or powder.",
                    "Remove overripe pods to redirect energy to new fruits.",
                    "Check the plant for other pods nearing overripe stage.",
                    "Save seeds from this pod for next season's planting.",
                ],
            },
        },
        # ─── Siling Demonyo (super-hot, harvested RED) ───────────────
        "Siling Demonyo": {
            "immature_green": {
                "ripeness": "Unripe",
                "description": "This Siling Demonyo pod is still green and developing — far from its extreme heat potential.",
                "days_to_harvest": 25,
                "spice_estimate": "Very Low — this super-hot variety needs full maturity for extreme capsaicin.",
                "shu_modifier": 0.15,
                "growth_advice": [
                    "Keep soil consistently moist — Demonyo peppers are heavy feeders.",
                    "Ensure at least 8 hours of full sun for proper development.",
                    "Apply calcium-rich fertilizer to prevent blossom-end rot.",
                    "Handle with gloves even now — some capsaicin is already present.",
                    "Do NOT harvest — the pod must mature fully for its legendary heat.",
                ],
            },
            "turning_orange": {
                "ripeness": "Turning",
                "description": "This Siling Demonyo is turning orange. Heat is building rapidly but hasn't maxed out.",
                "days_to_harvest": 7,
                "spice_estimate": "High — significant capsaicin, but not yet at Demonyo's full intensity.",
                "shu_modifier": 0.60,
                "growth_advice": [
                    "Almost ready — reduce watering to stress the plant slightly for more heat.",
                    "Handle with gloves! Capsaicin levels are already high.",
                    "For maximum heat, wait until fully red/orange.",
                    "Avoid disturbing the plant — stress can cause pod drop.",
                    "Good ventilation around the plant helps prevent fungal issues.",
                ],
            },
            "mature_red": {
                "ripeness": "Ripe",
                "description": "This Siling Demonyo is fully mature — EXTREME heat! Handle with caution.",
                "days_to_harvest": 0,
                "spice_estimate": "Extreme — peak capsaicin. One of the hottest local varieties.",
                "shu_modifier": 1.0,
                "growth_advice": [
                    "Harvest now with gloves! This pod is at EXTREME heat.",
                    "Cut the stem cleanly with scissors — never pull.",
                    "Wash hands thoroughly after handling, even with gloves.",
                    "Dry these peppers for long-term preservation of heat.",
                    "Leaving ripe pods stalls plant productivity — pick promptly.",
                ],
            },
            "overripe": {
                "ripeness": "Over-Ripe",
                "description": "This Siling Demonyo is past peak ripeness — the pod is softening and heat may be declining.",
                "days_to_harvest": 0,
                "spice_estimate": "Declining — still very hot but past optimal capsaicin concentration.",
                "shu_modifier": 0.85,
                "growth_advice": [
                    "Harvest immediately with gloves — still extremely hot!",
                    "Best used for drying into chili powder.",
                    "Remove overripe pods so the plant produces new fruit.",
                    "Pod texture may be soft; not ideal for fresh use.",
                    "Save seeds for next season — overripe pods produce viable seeds.",
                ],
            },
        },
        # ─── Siling Haba (mild finger chili, harvested GREEN) ────────
        "Siling Haba": {
            "immature_green": {
                "ripeness": "Ripe",
                "description": "This Siling Haba is green — exactly when it should be harvested! Siling Haba is best enjoyed green and firm.",
                "days_to_harvest": 0,
                "spice_estimate": "Mild to Moderate — standard heat for Siling Haba at its optimal harvest stage.",
                "shu_modifier": 1.0,
                "growth_advice": [
                    "Harvest now! Siling Haba is at its best when green and firm.",
                    "Use scissors to cut the stem cleanly.",
                    "Pick regularly to encourage continuous fruit production.",
                    "Store fresh in a cool, dry place — lasts 1–2 weeks refrigerated.",
                    "Great for sinigang, tinola, and other Filipino dishes.",
                ],
            },
            "turning_orange": {
                "ripeness": "Over-Mature",
                "description": "This Siling Haba is turning orange — it's past the ideal green harvest stage.",
                "days_to_harvest": 0,
                "spice_estimate": "Moderate — heat increases as Haba matures past green.",
                "shu_modifier": 1.2,
                "growth_advice": [
                    "This pod is past peak freshness for typical Siling Haba use.",
                    "Still edible — flavor will be slightly sweeter and less crisp.",
                    "Harvest immediately to prevent further over-ripening.",
                    "Prioritize picking remaining green pods from the plant first.",
                    "Can be dried for chili flakes if too mature for fresh use.",
                ],
            },
            "mature_red": {
                "ripeness": "Over-Ripe",
                "description": "This Siling Haba has turned red — well past optimal green harvest. Flavor and texture have changed significantly.",
                "days_to_harvest": 0,
                "spice_estimate": "Higher than typical — capsaicin increases as Haba over-ripens, but quality declines.",
                "shu_modifier": 1.4,
                "growth_advice": [
                    "Over-ripe for Siling Haba standards — harvest immediately.",
                    "Still usable for cooking but expect sweeter, softer texture.",
                    "Best used for drying into chili flakes or powder.",
                    "Remove over-ripe pods to keep the plant producing new green fruits.",
                    "Save seeds from red pods for planting next season.",
                ],
            },
            "overripe": {
                "ripeness": "Dried/Spent",
                "description": "This Siling Haba is overripe and likely shriveling — it's well past any harvest window.",
                "days_to_harvest": 0,
                "spice_estimate": "Variable — heat has concentrated through drying but overall quality is poor.",
                "shu_modifier": 1.3,
                "growth_advice": [
                    "Remove this pod from the plant immediately.",
                    "Can be dried fully and ground into chili powder.",
                    "Save seeds for next season — overripe pods produce viable seeds.",
                    "The plant will redirect energy to new fruit production once removed.",
                    "Inspect surrounding pods and harvest any green ones promptly.",
                ],
            },
        },
    }

    # ── Fallback for unknown varieties (assumes red-harvest) ────────
    DEFAULT_MATURITY_MAP: Dict[str, Dict[str, Any]] = {
        "immature_green": {
            "ripeness": "Unripe",
            "description": "The chili pod is green and immature.",
            "days_to_harvest": 20,
            "spice_estimate": "Very Low — capsaicin production has barely started.",
            "shu_modifier": 0.15,
            "growth_advice": [
                "Continue regular watering and ensure 6–8 hours of sunlight.",
                "Apply balanced fertilizer for pod development.",
                "Do NOT harvest yet — allow the pod to develop further.",
                "Monitor for common pests.",
                "Be patient — more time means more flavor and heat.",
            ],
        },
        "turning_orange": {
            "ripeness": "Turning",
            "description": "The chili is turning orange — transitioning toward full maturity.",
            "days_to_harvest": 5,
            "spice_estimate": "Moderate — capsaicin is accumulating.",
            "shu_modifier": 0.60,
            "growth_advice": [
                "Reduce watering slightly to concentrate flavors.",
                "Can be harvested for a milder taste.",
                "For more heat, wait until fully colored.",
                "Avoid heavy fertilization at this stage.",
                "Check for blossom-end rot.",
            ],
        },
        "mature_red": {
            "ripeness": "Ripe",
            "description": "The chili is fully mature with peak flavor and heat.",
            "days_to_harvest": 0,
            "spice_estimate": "Full — capsaicin concentration is at its maximum.",
            "shu_modifier": 1.0,
            "growth_advice": [
                "Harvest now! Peak flavor and spice.",
                "Use sharp scissors to cut — don't pull.",
                "Leaving ripe pods too long slows new production.",
                "Dry or freeze to preserve.",
                "Add compost after harvesting for the next cycle.",
            ],
        },
        "overripe": {
            "ripeness": "Over-Ripe",
            "description": "The chili is past its prime — pod is softening and quality is declining.",
            "days_to_harvest": 0,
            "spice_estimate": "Declining — capsaicin starts to degrade in overripe pods.",
            "shu_modifier": 0.85,
            "growth_advice": [
                "Harvest immediately — quality is declining.",
                "Best dried into chili flakes or powder.",
                "Remove overripe pods to encourage new fruit.",
                "Save seeds for next season.",
                "Inspect other pods for signs of over-ripening.",
            ],
        },
    }

    def __init__(self):
        self.api_key = settings.roboflow_maturity_api_key
        self.project_id = settings.roboflow_maturity_project_id
        self.model_version = settings.roboflow_maturity_model_version
        self.api_base = "https://serverless.roboflow.com"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.project_id)

    def _image_to_base64(self, image: Image.Image) -> str:
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    @classmethod
    def _normalize_class(cls, raw_class: str) -> str:
        """Normalize a raw model class name to a canonical key."""
        return cls._CLASS_ALIASES.get(
            raw_class.lower().strip().replace("-", "_").replace(" ", "_"),
            "mature_red",  # safe fallback
        )

    def _get_ripeness_info(self, variety: str, normalized_class: str) -> Dict[str, Any]:
        """Look up variety-aware ripeness info for a normalised maturity class."""
        variety_map = self.VARIETY_MATURITY_MAP.get(variety, self.DEFAULT_MATURITY_MAP)
        # variety_map can be the per-variety dict or the default dict
        if isinstance(next(iter(variety_map.values()), None), dict) and "ripeness" not in next(iter(variety_map.values()), {}):
            # It's a nested VARIETY_MATURITY_MAP entry (variety → class → info)
            info = variety_map.get(normalized_class)
        else:
            info = variety_map.get(normalized_class)

        if info is None:
            # Fallback to default map
            info = self.DEFAULT_MATURITY_MAP.get(normalized_class, self.DEFAULT_MATURITY_MAP["mature_red"])
        return info

    async def classify(self, image: Image.Image, variety: str = "Unknown") -> Dict[str, Any]:
        """
        Classify chili maturity, then interpret ripeness based on variety.

        Parameters
        ----------
        image   : PIL Image of the chili
        variety : detected chili variety (e.g. "Siling Labuyo", "Siling Haba")

        Returns
        -------
        dict with success, maturity_class (raw), maturity_stage (variety-aware
        ripeness), confidence, predictions, days_to_harvest, spice_estimate,
        shu_modifier, growth_advice, description, and variety_context.
        """
        if not self.is_configured:
            return {"success": False, "error": "Maturity classifier not configured"}

        image_b64 = self._image_to_base64(image)
        url = f"{self.api_base}/{self.project_id}/{self.model_version}"
        params = {"api_key": self.api_key}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    params=params,
                    data=image_b64,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                response.raise_for_status()
                raw = response.json()
                logger.info(f"Maturity classification raw: {raw}")

                # Parse classification response
                predictions_raw = raw.get("predictions", [])
                if not predictions_raw:
                    return {"success": False, "error": "No maturity predictions returned"}

                # Sort by confidence
                sorted_preds = sorted(
                    predictions_raw,
                    key=lambda x: x.get("confidence", 0),
                    reverse=True,
                )

                top = sorted_preds[0]
                raw_class = top.get("class", "unknown")
                normalized = self._normalize_class(raw_class)

                # Variety-aware ripeness lookup
                info = self._get_ripeness_info(variety, normalized)

                logger.info(
                    f"Maturity: raw_class={raw_class} → normalised={normalized}, "
                    f"variety={variety} → ripeness={info['ripeness']}"
                )

                return {
                    "success": True,
                    "maturity_class": raw_class,
                    "maturity_stage": info["ripeness"],
                    "confidence": top.get("confidence", 0),
                    "predictions": [
                        {"class": p.get("class", "unknown"), "confidence": p.get("confidence", 0)}
                        for p in sorted_preds
                    ],
                    "days_to_harvest": info["days_to_harvest"],
                    "spice_estimate": info["spice_estimate"],
                    "shu_modifier": info["shu_modifier"],
                    "growth_advice": info["growth_advice"],
                    "description": info["description"],
                    "variety_context": variety,
                }

        except httpx.HTTPError as e:
            logger.error(f"Maturity classifier API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Maturity classifier error: {e}")
            return {"success": False, "error": str(e)}


class FlowerStressClassifier:
    """
    Classify flower stress level using the chili-flower-stress-class/1 Roboflow model.
    Classes: healthy (757 samples), moderate_stress (497 samples).
    
    Stressed flowers correlate with higher capsaicin production (defense mechanism),
    so the stress_score feeds into SHU prediction.
    """

    def __init__(self):
        self.api_key = settings.roboflow_flower_stress_api_key
        self.project_id = settings.roboflow_flower_stress_project_id
        self.model_version = settings.roboflow_flower_stress_model_version
        self.api_base = "https://serverless.roboflow.com"

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key and self.project_id)

    def _image_to_base64(self, image: Image.Image) -> str:
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG", quality=90)
        return base64.b64encode(buffer.getvalue()).decode("utf-8")

    async def classify(self, image: Image.Image) -> Dict[str, Any]:
        """
        Classify flower stress from image.

        Returns
        -------
        dict with:
          - success: bool
          - stress_class: "healthy" | "moderate_stress"
          - stress_score: float 0-1 (0=healthy, 1=severe stress)
          - confidence: float
          - predictions: list of all class predictions
          - capsaicin_impact: str description of effect on heat
        """
        if not self.is_configured:
            return {"success": False, "error": "Flower stress classifier not configured"}

        image_b64 = self._image_to_base64(image)
        url = f"{self.api_base}/{self.project_id}/{self.model_version}"
        params = {"api_key": self.api_key}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    params=params,
                    data=image_b64,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )
                response.raise_for_status()
                raw = response.json()
                logger.info(f"Flower stress raw response: {raw}")

                predictions_raw = raw.get("predictions", [])
                if not predictions_raw:
                    return {"success": False, "error": "No flower stress predictions returned"}

                sorted_preds = sorted(
                    predictions_raw,
                    key=lambda x: x.get("confidence", 0),
                    reverse=True,
                )

                top = sorted_preds[0]
                stress_class = top.get("class", "unknown").lower().strip()
                confidence = top.get("confidence", 0)

                # Map to stress_score: 0 = healthy, 1 = max stress
                if stress_class == "healthy":
                    stress_score = max(0.0, 0.15 - 0.1 * confidence)
                elif stress_class == "moderate_stress":
                    stress_score = min(1.0, 0.5 + 0.4 * confidence)
                else:
                    stress_score = 0.3  # unknown default

                # Capsaicin impact description
                if stress_score < 0.2:
                    capsaicin_impact = "Minimal stress — baseline capsaicin production expected."
                elif stress_score < 0.5:
                    capsaicin_impact = "Low-moderate stress — slight increase in capsaicin likely."
                elif stress_score < 0.75:
                    capsaicin_impact = "Moderate stress — plant likely producing elevated capsaicin as defense."
                else:
                    capsaicin_impact = "High stress — significant capsaicin boost expected (defense mechanism)."

                return {
                    "success": True,
                    "stress_class": stress_class,
                    "stress_score": round(stress_score, 4),
                    "confidence": confidence,
                    "predictions": [
                        {"class": p.get("class", "unknown"), "confidence": p.get("confidence", 0)}
                        for p in sorted_preds
                    ],
                    "capsaicin_impact": capsaicin_impact,
                    "shu_multiplier": round(1.0 + stress_score * 0.3, 3),
                }

        except httpx.HTTPError as e:
            logger.error(f"Flower stress API error: {e}")
            return {"success": False, "error": str(e)}
        except Exception as e:
            logger.error(f"Flower stress classification error: {e}")
            return {"success": False, "error": str(e)}


# Global instances
chili_segmenter = ChiliSegmenter()
roboflow_segmenter = RoboflowSegmenter()
maturity_classifier = ChiliMaturityClassifier()
flower_stress_classifier = FlowerStressClassifier()


async def classify_chili_image(image: Image.Image, model_version: Optional[str] = None) -> Dict[str, Any]:
    """
    Convenience function to classify a chili image.
    
    Uses the classification model first. If it returns "Others",
    falls back to the segmentation model which can detect Siling Demonyo
    (since the classification model may not have that class).
    
    Args:
        image: PIL Image of chili pepper/flower
        model_version: Optional Roboflow model version override
        
    Returns:
        Dict with:
        - variety: Predicted chili variety name
        - confidence: Prediction confidence (0-1)
        - predictions: All predictions with confidences
        - success: Whether classification succeeded
    """
    if not roboflow_classifier.is_configured:
        return {
            "success": False,
            "error": "Roboflow not configured. Add ROBOFLOW_API_KEY to .env",
            "variety": None,
            "confidence": 0
        }
    
    try:
        result = await roboflow_classifier.predict(image, model_version=model_version)
        
        if result["success"] and result["top_prediction"]:
            raw_class = result["top_prediction"]
            logger.info(f"Raw Roboflow class: '{raw_class}' | confidence: {result['confidence']:.4f}")
            variety = roboflow_classifier.map_to_variety(raw_class)
            logger.info(f"Mapped variety: '{variety}'")
            
            # If classified as "Others", try the segmentation model as fallback.
            # The segmentation model has siling-demonyo-pod, siling-haba-pod,
            # siling-labuyo-pod classes and can identify Demonyo peppers that
            # the classification model doesn't recognize.
            if variety == "Others" and chili_segmenter.is_configured:
                logger.info("Classifier returned 'Others' — trying segmentation model as fallback")
                try:
                    seg_result = await chili_segmenter.segment(image)
                    segments = seg_result.get("segments", [])
                    if segments:
                        # Use the highest-confidence segment's variety
                        best_seg = max(segments, key=lambda s: s.get("confidence", 0))
                        seg_variety = best_seg.get("variety", "")
                        seg_confidence = best_seg.get("confidence", 0)
                        if seg_variety and seg_variety != "Unknown" and seg_confidence > 0.3:
                            logger.info(
                                f"Segmentation fallback found: '{seg_variety}' "
                                f"(confidence: {seg_confidence:.4f})"
                            )
                            return {
                                "success": True,
                                "variety": seg_variety,
                                "confidence": seg_confidence,
                                "predictions": [
                                    {"class": s.get("raw_class", ""), "confidence": s.get("confidence", 0)}
                                    for s in segments
                                ],
                                "raw_class": best_seg.get("raw_class", raw_class),
                                "is_chili": True,
                                "detection_method": "segmentation_fallback",
                            }
                except Exception as e:
                    logger.warning(f"Segmentation fallback failed: {e}")
            
            # Check if classified as non-chili ("Others")
            is_chili = variety != "Others"
            
            return {
                "success": True,
                "variety": variety,
                "confidence": result["confidence"],
                "predictions": result["predictions"],
                "raw_class": result["top_prediction"],
                "is_chili": is_chili,
            }
        else:
            return {
                "success": False,
                "error": "No predictions returned",
                "variety": None,
                "confidence": 0
            }
            
    except Exception as e:
        logger.error(f"Classification error: {e}")
        return {
            "success": False,
            "error": str(e),
            "variety": None,
            "confidence": 0
        }
