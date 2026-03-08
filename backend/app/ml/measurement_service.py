"""
Automated Measurement Service
=============================

Extract physical measurements from images using scale reference.
"""

import cv2
import numpy as np
from typing import Dict, Tuple, Optional, List
import logging

logger = logging.getLogger(__name__)

# Known reference sizes (in mm)
REFERENCE_SIZES = {
    "php_1_peso": 23.0,  # 1 peso coin diameter
    "php_5_peso": 27.0,  # 5 peso coin diameter
    "php_10_peso": 26.5,  # 10 peso coin diameter
    "us_quarter": 24.26,  # US quarter diameter
    "credit_card_width": 85.6,  # Standard credit card
    "ruler_cm": 10.0,  # 1 cm mark on ruler
}


class AutomatedMeasurement:
    """
    Automated measurement system using computer vision.
    
    Detects scale reference objects and calculates real-world measurements.
    """
    
    def __init__(self):
        self.pixels_per_mm: Optional[float] = None
        self.reference_detected: bool = False
        self.reference_type: Optional[str] = None
    
    def detect_circles(
        self,
        image: np.ndarray,
        min_radius: int = 20,
        max_radius: int = 100
    ) -> List[Tuple[int, int, int]]:
        """
        Detect circular objects (likely coins) in image.
        
        Args:
            image: Input image (BGR format)
            min_radius: Minimum circle radius in pixels
            max_radius: Maximum circle radius in pixels
            
        Returns:
            List of (x, y, radius) tuples
        """
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (9, 9), 2)
        
        circles = cv2.HoughCircles(
            blurred,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=50,
            param1=100,
            param2=30,
            minRadius=min_radius,
            maxRadius=max_radius
        )
        
        if circles is None:
            return []
        
        circles = np.uint16(np.around(circles))
        return [(c[0], c[1], c[2]) for c in circles[0]]
    
    def detect_scale_reference(
        self,
        image: np.ndarray,
        reference_type: str = "php_1_peso"
    ) -> Optional[float]:
        """
        Detect scale reference and calculate pixels-to-mm ratio.
        
        Args:
            image: Input image
            reference_type: Type of reference object
            
        Returns:
            Pixels per mm ratio, or None if not detected
        """
        if reference_type not in REFERENCE_SIZES:
            logger.warning(f"Unknown reference type: {reference_type}")
            return None
        
        known_size_mm = REFERENCE_SIZES[reference_type]
        
        # Detect circles (coins)
        circles = self.detect_circles(image)
        
        if not circles:
            logger.warning("No circular reference detected")
            return None
        
        # Use largest circle (most likely the reference)
        largest = max(circles, key=lambda c: c[2])
        radius_px = largest[2]
        diameter_px = radius_px * 2
        
        # Calculate ratio
        pixels_per_mm = diameter_px / known_size_mm
        
        self.pixels_per_mm = pixels_per_mm
        self.reference_detected = True
        self.reference_type = reference_type
        
        logger.info(f"Reference detected: {pixels_per_mm:.2f} px/mm")
        
        return pixels_per_mm
    
    def calibrate_from_known_distance(
        self,
        pixel_distance: float,
        real_distance_mm: float
    ) -> float:
        """
        Calibrate using a known distance.
        
        Args:
            pixel_distance: Distance in pixels
            real_distance_mm: Real distance in millimeters
            
        Returns:
            Pixels per mm ratio
        """
        self.pixels_per_mm = pixel_distance / real_distance_mm
        self.reference_detected = True
        return self.pixels_per_mm
    
    def detect_main_object(self, image: np.ndarray) -> Optional[np.ndarray]:
        """
        Detect the main object (chili) in image.
        
        Returns the largest contour that's not circular (coin).
        """
        # Convert to HSV for better segmentation
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Create mask for colored objects (exclude white/gray background)
        lower = np.array([0, 50, 50])
        upper = np.array([180, 255, 255])
        mask = cv2.inRange(hsv, lower, upper)
        
        # Clean up mask
        kernel = np.ones((5, 5), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(
            mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return None
        
        # Filter out circular contours (coins)
        elongated_contours = []
        for contour in contours:
            if len(contour) < 5:
                continue
            
            # Fit ellipse
            ellipse = cv2.fitEllipse(contour)
            (_, (major, minor), _) = ellipse
            
            # Calculate aspect ratio
            if minor > 0:
                aspect_ratio = major / minor
                if aspect_ratio > 1.5:  # Elongated shape (likely chili)
                    elongated_contours.append(contour)
        
        if not elongated_contours:
            # Fall back to largest contour
            return max(contours, key=cv2.contourArea)
        
        # Return largest elongated contour
        return max(elongated_contours, key=cv2.contourArea)
    
    def measure_pod_length(self, image: np.ndarray) -> Optional[float]:
        """
        Measure pod length in millimeters.
        
        Args:
            image: Input image
            
        Returns:
            Length in mm, or None if measurement failed
        """
        contour = self.detect_main_object(image)
        
        if contour is None or len(contour) < 5:
            return None
        
        # Get minimum area bounding rectangle
        rect = cv2.minAreaRect(contour)
        box = cv2.boxPoints(rect)
        
        # Get dimensions
        width = rect[1][0]
        height = rect[1][1]
        length_px = max(width, height)
        
        # Convert to mm
        if self.pixels_per_mm and self.pixels_per_mm > 0:
            length_mm = length_px / self.pixels_per_mm
        else:
            # Estimate based on typical image scale
            length_mm = length_px * 0.1  # Rough estimate
        
        return round(length_mm, 1)
    
    def measure_pod_width(self, image: np.ndarray) -> Optional[float]:
        """
        Measure pod width in millimeters.
        
        Args:
            image: Input image
            
        Returns:
            Width in mm, or None if measurement failed
        """
        contour = self.detect_main_object(image)
        
        if contour is None or len(contour) < 5:
            return None
        
        rect = cv2.minAreaRect(contour)
        width = rect[1][0]
        height = rect[1][1]
        width_px = min(width, height)
        
        if self.pixels_per_mm and self.pixels_per_mm > 0:
            width_mm = width_px / self.pixels_per_mm
        else:
            width_mm = width_px * 0.1
        
        return round(width_mm, 1)
    
    def measure_flower_diameter(self, image: np.ndarray) -> Optional[float]:
        """
        Measure flower diameter (corolla) in millimeters.
        
        Uses color-based detection for white/light-colored petals.
        """
        # Convert to HSV
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        
        # Mask for white/light colored petals
        lower = np.array([0, 0, 200])
        upper = np.array([180, 50, 255])
        mask = cv2.inRange(hsv, lower, upper)
        
        # Clean up
        kernel = np.ones((3, 3), np.uint8)
        mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
        
        # Find contours
        contours, _ = cv2.findContours(
            mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )
        
        if not contours:
            return None
        
        # Get largest contour (flower)
        flower_contour = max(contours, key=cv2.contourArea)
        
        if len(flower_contour) < 5:
            return None
        
        # Fit circle or ellipse
        (x, y), radius = cv2.minEnclosingCircle(flower_contour)
        diameter_px = radius * 2
        
        if self.pixels_per_mm and self.pixels_per_mm > 0:
            diameter_mm = diameter_px / self.pixels_per_mm
        else:
            diameter_mm = diameter_px * 0.1
        
        return round(diameter_mm, 1)
    
    def measure_all(self, image: np.ndarray) -> Dict:
        """
        Perform all measurements on an image.
        
        Args:
            image: Input image
            
        Returns:
            Dictionary with all measurements
        """
        # Try to detect scale reference
        self.detect_scale_reference(image)
        
        results = {
            "scale_reference_detected": self.reference_detected,
            "pixels_per_mm": self.pixels_per_mm,
            "reference_type": self.reference_type,
            "measurements": {}
        }
        
        # Measure pod dimensions
        pod_length = self.measure_pod_length(image)
        pod_width = self.measure_pod_width(image)
        flower_diameter = self.measure_flower_diameter(image)
        
        if pod_length:
            results["measurements"]["pod_length_mm"] = pod_length
        if pod_width:
            results["measurements"]["pod_width_mm"] = pod_width
        if flower_diameter:
            results["measurements"]["flower_diameter_mm"] = flower_diameter
        
        # Calculate area if both dimensions available
        if pod_length and pod_width:
            # Approximate as ellipse
            results["measurements"]["pod_area_mm2"] = round(
                np.pi * (pod_length / 2) * (pod_width / 2), 1
            )
        
        return results
    
    def visualize_measurements(
        self,
        image: np.ndarray,
        measurements: Dict
    ) -> np.ndarray:
        """
        Draw measurements on image for visualization.
        
        Args:
            image: Input image
            measurements: Measurement results
            
        Returns:
            Annotated image
        """
        annotated = image.copy()
        
        contour = self.detect_main_object(image)
        
        if contour is not None and len(contour) >= 5:
            # Draw contour
            cv2.drawContours(annotated, [contour], -1, (0, 255, 0), 2)
            
            # Draw bounding box
            rect = cv2.minAreaRect(contour)
            box = cv2.boxPoints(rect)
            box = np.int0(box)
            cv2.drawContours(annotated, [box], 0, (0, 0, 255), 2)
            
            # Add measurement text
            m = measurements.get("measurements", {})
            y_offset = 30
            
            if "pod_length_mm" in m:
                cv2.putText(
                    annotated,
                    f"Length: {m['pod_length_mm']} mm",
                    (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (255, 255, 255),
                    2
                )
                y_offset += 30
            
            if "pod_width_mm" in m:
                cv2.putText(
                    annotated,
                    f"Width: {m['pod_width_mm']} mm",
                    (10, y_offset),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (255, 255, 255),
                    2
                )
        
        return annotated
