"""
Color Feature Extractor
========================

Extracts RGB/HSV color features from chili pepper images for use
as input features to the maturity predictor and SHU models.
Works with uploaded images (PIL) or segmentation masks.
"""

import io
import logging
import numpy as np
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    logger.warning("PIL not available; color extraction will be limited")


def extract_color_features(
    image_bytes: Optional[bytes] = None,
    image_pil: Optional[Any] = None,
    mask_bytes: Optional[bytes] = None,
) -> Dict[str, Any]:
    """
    Extract comprehensive color features from a chili pepper image.

    Args:
        image_bytes: Raw image bytes (JPEG/PNG)
        image_pil: PIL Image object (alternative to bytes)
        mask_bytes: Optional binary mask to isolate chili from background

    Returns:
        Dict with keys:
          - color_r, color_g, color_b: mean RGB (0-255)
          - color_r_std, color_g_std, color_b_std: RGB std devs
          - hue, saturation, value_hsv: mean HSV
          - hue_std, saturation_std, value_hsv_std: HSV std devs
          - red_ratio, green_ratio: channel ratios
          - dominant_color_rgb: (R, G, B)
          - color_analysis: descriptive analysis string
    """
    if not HAS_PIL:
        return _default_features("PIL not available")

    try:
        if image_pil is not None:
            img = image_pil.convert("RGB") if image_pil.mode != "RGB" else image_pil
        elif image_bytes is not None:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        else:
            return _default_features("No image provided")

        pixels = np.array(img, dtype=np.float32)

        # Apply mask if provided
        if mask_bytes is not None:
            try:
                mask = Image.open(io.BytesIO(mask_bytes)).convert("L")
                mask = mask.resize(img.size)
                mask_arr = np.array(mask) > 128  # threshold
                if mask_arr.sum() > 100:  # at least 100 pixels
                    pixels = pixels[mask_arr]
                else:
                    pixels = pixels.reshape(-1, 3)
            except Exception:
                pixels = pixels.reshape(-1, 3)
        else:
            # Simple background removal: ignore near-white / near-black pixels
            flat = pixels.reshape(-1, 3)
            brightness = flat.mean(axis=1)
            mask_valid = (brightness > 30) & (brightness < 240)
            if mask_valid.sum() > 100:
                pixels = flat[mask_valid]
            else:
                pixels = flat

        if len(pixels.shape) > 2:
            pixels = pixels.reshape(-1, 3)

        # RGB stats
        r_mean, g_mean, b_mean = pixels.mean(axis=0)
        r_std, g_std, b_std = pixels.std(axis=0)

        # Convert to HSV
        hsv_pixels = _rgb_to_hsv_batch(pixels)
        h_mean, s_mean, v_mean = hsv_pixels.mean(axis=0)
        h_std, s_std, v_std = hsv_pixels.std(axis=0)

        # Ratios
        total = r_mean + g_mean + b_mean + 1e-6
        red_ratio = r_mean / total
        green_ratio = g_mean / total

        # Dominant color via simple histogram binning
        dominant = _find_dominant_color(pixels)

        # Color analysis
        analysis = _analyze_color(h_mean, s_mean, v_mean, red_ratio, green_ratio)

        return {
            "color_r": round(float(r_mean)),
            "color_g": round(float(g_mean)),
            "color_b": round(float(b_mean)),
            "color_r_std": round(float(r_std), 1),
            "color_g_std": round(float(g_std), 1),
            "color_b_std": round(float(b_std), 1),
            "hue": round(float(h_mean), 1),
            "saturation": round(float(s_mean), 1),
            "value_hsv": round(float(v_mean), 1),
            "hue_std": round(float(h_std), 1),
            "saturation_std": round(float(s_std), 1),
            "value_hsv_std": round(float(v_std), 1),
            "red_ratio": round(float(red_ratio), 4),
            "green_ratio": round(float(green_ratio), 4),
            "dominant_color_rgb": tuple(int(c) for c in dominant),
            "color_analysis": analysis,
            "pixel_count": len(pixels),
        }

    except Exception as e:
        logger.error(f"Color extraction failed: {e}")
        return _default_features(str(e))


def _rgb_to_hsv_batch(rgb: np.ndarray) -> np.ndarray:
    """
    Convert Nx3 RGB (0-255) array to Nx3 HSV (H: 0-180, S: 0-255, V: 0-255)
    matching OpenCV convention.
    """
    rgb_norm = rgb / 255.0
    r, g, b = rgb_norm[:, 0], rgb_norm[:, 1], rgb_norm[:, 2]

    cmax = np.maximum(np.maximum(r, g), b)
    cmin = np.minimum(np.minimum(r, g), b)
    diff = cmax - cmin + 1e-10

    # Hue (0-180 like OpenCV)
    h = np.zeros_like(r)
    mask_r = cmax == r
    mask_g = (cmax == g) & ~mask_r
    mask_b = ~mask_r & ~mask_g

    h[mask_r] = (60 * ((g[mask_r] - b[mask_r]) / diff[mask_r]) + 360) % 360
    h[mask_g] = (60 * ((b[mask_g] - r[mask_g]) / diff[mask_g]) + 120) % 360
    h[mask_b] = (60 * ((r[mask_b] - g[mask_b]) / diff[mask_b]) + 240) % 360
    h = h / 2.0  # Scale to 0-180 (OpenCV)

    # Saturation
    s = np.where(cmax == 0, 0, (diff / (cmax + 1e-10)) * 255.0)

    # Value
    v = cmax * 255.0

    return np.stack([h, s, v], axis=1)


def _find_dominant_color(pixels: np.ndarray, k: int = 3) -> Tuple[int, int, int]:
    """Find dominant color using simple histogram binning (no sklearn KMeans dependency)."""
    binned = (pixels // 32).astype(int) * 32 + 16
    binned = np.clip(binned, 0, 255)

    unique, counts = np.unique(binned.astype(int), axis=0, return_counts=True)
    idx = np.argmax(counts)
    return tuple(unique[idx].astype(int))


def _analyze_color(
    hue: float, sat: float, val: float,
    red_ratio: float, green_ratio: float
) -> str:
    """Generate a human-readable color analysis string."""
    parts = []

    if hue < 15 or hue > 165:
        parts.append("Red-dominant")
    elif hue < 30:
        parts.append("Orange-toned")
    elif hue < 45:
        parts.append("Yellow-orange")
    elif hue < 75:
        parts.append("Green-yellow")
    elif hue < 100:
        parts.append("Green")
    else:
        parts.append("Mixed hue")

    if sat > 180:
        parts.append("highly saturated")
    elif sat > 100:
        parts.append("moderately saturated")
    else:
        parts.append("low saturation")

    if val > 180:
        parts.append("bright")
    elif val > 100:
        parts.append("medium brightness")
    else:
        parts.append("dark")

    if red_ratio > 0.45:
        parts.append("(indicates ripe/mature)")
    elif green_ratio > 0.40:
        parts.append("(indicates immature/green)")

    return ", ".join(parts)


def _default_features(reason: str) -> Dict[str, Any]:
    """Return neutral default features when extraction fails."""
    return {
        "color_r": 128, "color_g": 128, "color_b": 128,
        "color_r_std": 0, "color_g_std": 0, "color_b_std": 0,
        "hue": 60, "saturation": 128, "value_hsv": 128,
        "hue_std": 0, "saturation_std": 0, "value_hsv_std": 0,
        "red_ratio": 0.33, "green_ratio": 0.33,
        "dominant_color_rgb": (128, 128, 128),
        "color_analysis": f"Extraction failed: {reason}",
        "pixel_count": 0,
    }
