"""
Image Processing Service
========================

Preprocessing, feature extraction, and image enhancement utilities.
"""

import cv2
import numpy as np
from PIL import Image
from typing import Dict, Tuple, Optional, Any
import io


class ImageProcessor:
    """
    Image preprocessing and feature extraction for chili morphology analysis.
    """
    
    def __init__(self, target_size: Tuple[int, int] = (512, 512)):
        """
        Initialize the image processor.
        
        Args:
            target_size: Target size for image resizing (width, height)
        """
        self.target_size = target_size
    
    def load_image(self, image_path: str) -> np.ndarray:
        """
        Load image from file path.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Image as numpy array (BGR format)
        """
        image = cv2.imread(image_path)
        if image is None:
            raise ValueError(f"Could not load image from {image_path}")
        return image
    
    def load_image_from_bytes(self, image_bytes: bytes) -> np.ndarray:
        """
        Load image from bytes.
        
        Args:
            image_bytes: Image data as bytes
            
        Returns:
            Image as numpy array (BGR format)
        """
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("Could not decode image from bytes")
        return image
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for ML model input.
        
        Steps:
        1. Resize to standard dimensions
        2. Convert to RGB
        3. Normalize pixel values (0-1)
        4. Apply color correction if needed
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            Preprocessed image as numpy array
        """
        # Resize
        resized = cv2.resize(image, self.target_size, interpolation=cv2.INTER_LANCZOS4)
        
        # Convert BGR to RGB
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        
        # Normalize to 0-1
        normalized = rgb.astype(np.float32) / 255.0
        
        return normalized
    
    def enhance_image(self, image: np.ndarray) -> np.ndarray:
        """
        Enhance image quality for better feature extraction.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            Enhanced image
        """
        # Apply CLAHE for contrast enhancement
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        
        enhanced = cv2.merge([l, a, b])
        enhanced = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)
        
        # Slight sharpening
        kernel = np.array([[-1, -1, -1],
                          [-1,  9, -1],
                          [-1, -1, -1]])
        sharpened = cv2.filter2D(enhanced, -1, kernel)
        
        # Blend original and sharpened
        result = cv2.addWeighted(enhanced, 0.7, sharpened, 0.3, 0)
        
        return result
    
    def extract_color_features(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Extract RGB and HSV color features from image.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            Dictionary containing color features
        """
        # Convert to RGB
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Convert to HSV
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Calculate mean RGB
        mean_rgb = np.mean(rgb, axis=(0, 1))
        
        # Calculate mean HSV
        mean_hsv = np.mean(hsv, axis=(0, 1))
        
        # Calculate dominant colors using k-means
        pixels = rgb.reshape(-1, 3).astype(np.float32)
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 100, 0.2)
        k = 5
        _, labels, centers = cv2.kmeans(
            pixels, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS
        )
        
        # Sort by frequency
        unique, counts = np.unique(labels, return_counts=True)
        sorted_indices = np.argsort(-counts)
        dominant_colors = centers[sorted_indices].astype(int).tolist()
        
        # Calculate color histogram
        hist_r = cv2.calcHist([rgb], [0], None, [256], [0, 256]).flatten()
        hist_g = cv2.calcHist([rgb], [1], None, [256], [0, 256]).flatten()
        hist_b = cv2.calcHist([rgb], [2], None, [256], [0, 256]).flatten()
        
        return {
            "mean_rgb": {
                "r": float(mean_rgb[0]),
                "g": float(mean_rgb[1]),
                "b": float(mean_rgb[2])
            },
            "mean_hsv": {
                "h": float(mean_hsv[0]),
                "s": float(mean_hsv[1]),
                "v": float(mean_hsv[2])
            },
            "dominant_colors": dominant_colors[:3],
            "color_variance": {
                "r": float(np.var(rgb[:, :, 0])),
                "g": float(np.var(rgb[:, :, 1])),
                "b": float(np.var(rgb[:, :, 2]))
            },
            "brightness": float(np.mean(hsv[:, :, 2])),
            "saturation": float(np.mean(hsv[:, :, 1]))
        }
    
    def extract_shape_features(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Extract shape and contour features from image.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            Dictionary containing shape features
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Edge detection
        edges = cv2.Canny(blurred, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(
            edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return {
                "area": 0,
                "perimeter": 0,
                "aspect_ratio": 1.0,
                "extent": 0,
                "solidity": 0,
                "symmetry_score": 0
            }
        
        # Get largest contour (main object)
        main_contour = max(contours, key=cv2.contourArea)
        
        # Calculate features
        area = cv2.contourArea(main_contour)
        perimeter = cv2.arcLength(main_contour, True)
        
        # Bounding rectangle
        x, y, w, h = cv2.boundingRect(main_contour)
        aspect_ratio = float(w) / h if h > 0 else 1.0
        rect_area = w * h
        extent = float(area) / rect_area if rect_area > 0 else 0
        
        # Convex hull
        hull = cv2.convexHull(main_contour)
        hull_area = cv2.contourArea(hull)
        solidity = float(area) / hull_area if hull_area > 0 else 0
        
        # Simple symmetry score (compare left and right halves)
        center_x = x + w // 2
        left_half = image[:, :center_x]
        right_half = cv2.flip(image[:, center_x:], 1)
        
        # Resize to match
        min_width = min(left_half.shape[1], right_half.shape[1])
        if min_width > 0:
            left_half = left_half[:, :min_width]
            right_half = right_half[:, :min_width]
            diff = cv2.absdiff(left_half, right_half)
            symmetry_score = 1.0 - (np.mean(diff) / 255.0)
        else:
            symmetry_score = 0.5
        
        return {
            "area": float(area),
            "perimeter": float(perimeter),
            "aspect_ratio": aspect_ratio,
            "extent": extent,
            "solidity": solidity,
            "symmetry_score": float(symmetry_score),
            "bounding_box": {"x": x, "y": y, "width": w, "height": h}
        }
    
    def extract_texture_features(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Extract texture features using Gabor filters and LBP.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            Dictionary containing texture features
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Gabor filter responses at different orientations
        gabor_responses = []
        for theta in range(0, 180, 45):
            kernel = cv2.getGaborKernel(
                (21, 21), 5.0, np.radians(theta), 10.0, 0.5, 0, cv2.CV_32F
            )
            filtered = cv2.filter2D(gray, cv2.CV_32F, kernel)
            gabor_responses.append(np.mean(np.abs(filtered)))
        
        # Local Binary Pattern (simplified)
        def lbp_calculate(img):
            patterns = np.zeros_like(img, dtype=np.uint8)
            for i in range(1, img.shape[0] - 1):
                for j in range(1, img.shape[1] - 1):
                    center = img[i, j]
                    pattern = 0
                    neighbors = [
                        img[i-1, j-1], img[i-1, j], img[i-1, j+1],
                        img[i, j+1], img[i+1, j+1], img[i+1, j],
                        img[i+1, j-1], img[i, j-1]
                    ]
                    for k, neighbor in enumerate(neighbors):
                        if neighbor >= center:
                            pattern |= (1 << k)
                    patterns[i, j] = pattern
            return patterns
        
        # Use downsampled image for LBP (faster)
        small = cv2.resize(gray, (64, 64))
        lbp = lbp_calculate(small)
        hist, _ = np.histogram(lbp.flatten(), bins=256, range=(0, 256))
        hist = hist.astype(float) / hist.sum()  # Normalize
        
        return {
            "gabor_energy": gabor_responses,
            "gabor_mean": float(np.mean(gabor_responses)),
            "lbp_entropy": float(-np.sum(hist * np.log2(hist + 1e-10))),
            "texture_uniformity": float(np.sum(hist ** 2)),
            "contrast": float(np.std(gray))
        }
    
    def remove_background(self, image: np.ndarray) -> np.ndarray:
        """
        Remove background from image using GrabCut algorithm.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            Image with transparent background (BGRA format)
        """
        # Create initial mask
        mask = np.zeros(image.shape[:2], np.uint8)
        
        # Define rectangle around the object (assuming object is centered)
        h, w = image.shape[:2]
        margin = int(min(h, w) * 0.1)
        rect = (margin, margin, w - 2 * margin, h - 2 * margin)
        
        # Initialize models
        bgd_model = np.zeros((1, 65), np.float64)
        fgd_model = np.zeros((1, 65), np.float64)
        
        # Apply GrabCut
        cv2.grabCut(image, mask, rect, bgd_model, fgd_model, 5, cv2.GC_INIT_WITH_RECT)
        
        # Create final mask
        mask2 = np.where((mask == 2) | (mask == 0), 0, 1).astype('uint8')
        
        # Apply mask to image
        result = image * mask2[:, :, np.newaxis]
        
        # Create BGRA image with transparency
        b, g, r = cv2.split(result)
        alpha = mask2 * 255
        bgra = cv2.merge([b, g, r, alpha])
        
        return bgra
    
    def get_image_quality_score(self, image: np.ndarray) -> float:
        """
        Calculate image quality score based on sharpness, exposure, and noise.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            Quality score (0-100)
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Sharpness (Laplacian variance)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        sharpness = laplacian.var()
        sharpness_score = min(100, sharpness / 5)  # Normalize
        
        # Exposure (histogram spread)
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist_spread = np.std(hist)
        exposure_score = min(100, hist_spread / 10)
        
        # Brightness
        brightness = np.mean(gray)
        brightness_score = 100 - abs(brightness - 127) * 0.8  # Optimal around 127
        
        # Noise estimation (using median filter difference)
        median = cv2.medianBlur(gray, 5)
        noise = np.mean(np.abs(gray.astype(float) - median.astype(float)))
        noise_score = max(0, 100 - noise * 5)
        
        # Combined score
        quality_score = (
            sharpness_score * 0.4 +
            exposure_score * 0.2 +
            brightness_score * 0.2 +
            noise_score * 0.2
        )
        
        return min(100, max(0, quality_score))
    
    def extract_all_features(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Extract all features from an image.
        
        Args:
            image: Input image (BGR format)
            
        Returns:
            Dictionary containing all extracted features
        """
        return {
            "color_features": self.extract_color_features(image),
            "shape_features": self.extract_shape_features(image),
            "texture_features": self.extract_texture_features(image),
            "quality_score": self.get_image_quality_score(image)
        }
