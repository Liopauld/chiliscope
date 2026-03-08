"""
Variety Classifier
==================

CNN-based variety classification for Philippine chili varieties.
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
import os
import logging

logger = logging.getLogger(__name__)

# Variety labels
VARIETY_LABELS = ["Siling Haba", "Siling Labuyo", "Siling Demonyo"]
VARIETY_INDEX = {label: i for i, label in enumerate(VARIETY_LABELS)}


class VarietyClassifier:
    """
    CNN-based classifier for chili variety identification.
    
    Uses transfer learning with EfficientNet or custom CNN architecture.
    """
    
    def __init__(self, model_path: Optional[str] = None):
        """
        Initialize the variety classifier.
        
        Args:
            model_path: Path to the trained model file (.h5)
        """
        self.model = None
        self.model_path = model_path
        self.input_shape = (512, 512, 3)
        self.num_classes = len(VARIETY_LABELS)
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
    
    def build_model(self):
        """
        Build the CNN model architecture.
        
        Uses EfficientNetB0 as base with custom classification head.
        """
        try:
            from tensorflow import keras
            from tensorflow.keras import layers
            from tensorflow.keras.applications import EfficientNetB0
            
            # Base model
            base_model = EfficientNetB0(
                weights='imagenet',
                include_top=False,
                input_shape=self.input_shape
            )
            
            # Freeze base layers
            base_model.trainable = False
            
            # Build model
            inputs = keras.Input(shape=self.input_shape)
            x = base_model(inputs, training=False)
            x = layers.GlobalAveragePooling2D()(x)
            x = layers.BatchNormalization()(x)
            x = layers.Dense(512, activation='relu')(x)
            x = layers.Dropout(0.5)(x)
            x = layers.Dense(256, activation='relu')(x)
            x = layers.Dropout(0.3)(x)
            outputs = layers.Dense(self.num_classes, activation='softmax')(x)
            
            self.model = keras.Model(inputs, outputs)
            
            # Compile
            self.model.compile(
                optimizer=keras.optimizers.Adam(learning_rate=0.001),
                loss='categorical_crossentropy',
                metrics=['accuracy']
            )
            
            logger.info("CNN model built successfully")
            
        except ImportError:
            logger.warning("TensorFlow not available. Using mock model.")
            self.model = None
    
    def build_simple_model(self):
        """
        Build a simpler CNN model for faster inference.
        """
        try:
            from tensorflow import keras
            from tensorflow.keras import layers
            
            model = keras.Sequential([
                # Input
                keras.Input(shape=self.input_shape),
                
                # Conv Block 1
                layers.Conv2D(32, 3, activation='relu', padding='same'),
                layers.BatchNormalization(),
                layers.MaxPooling2D(2),
                
                # Conv Block 2
                layers.Conv2D(64, 3, activation='relu', padding='same'),
                layers.BatchNormalization(),
                layers.MaxPooling2D(2),
                
                # Conv Block 3
                layers.Conv2D(128, 3, activation='relu', padding='same'),
                layers.BatchNormalization(),
                layers.MaxPooling2D(2),
                
                # Conv Block 4
                layers.Conv2D(256, 3, activation='relu', padding='same'),
                layers.BatchNormalization(),
                layers.MaxPooling2D(2),
                
                # Classification Head
                layers.GlobalAveragePooling2D(),
                layers.Dense(512, activation='relu'),
                layers.Dropout(0.5),
                layers.Dense(256, activation='relu'),
                layers.Dropout(0.3),
                layers.Dense(self.num_classes, activation='softmax')
            ])
            
            model.compile(
                optimizer='adam',
                loss='categorical_crossentropy',
                metrics=['accuracy']
            )
            
            self.model = model
            logger.info("Simple CNN model built successfully")
            
        except ImportError:
            logger.warning("TensorFlow not available. Using mock predictions.")
            self.model = None
    
    def load_model(self, model_path: str) -> bool:
        """
        Load a trained model from file.
        
        Args:
            model_path: Path to the model file
            
        Returns:
            True if loaded successfully, False otherwise
        """
        try:
            from tensorflow import keras
            self.model = keras.models.load_model(model_path)
            self.model_path = model_path
            logger.info(f"Model loaded from {model_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False
    
    def save_model(self, model_path: str) -> bool:
        """
        Save the trained model to file.
        
        Args:
            model_path: Path to save the model
            
        Returns:
            True if saved successfully, False otherwise
        """
        if self.model is None:
            logger.error("No model to save")
            return False
        
        try:
            self.model.save(model_path)
            self.model_path = model_path
            logger.info(f"Model saved to {model_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to save model: {e}")
            return False
    
    def preprocess_for_prediction(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for model prediction.
        
        Args:
            image: Image array (H, W, C) in RGB format, values 0-1
            
        Returns:
            Preprocessed image batch (1, H, W, C)
        """
        # Ensure correct shape
        if image.shape != self.input_shape:
            import cv2
            image = cv2.resize(image, (self.input_shape[0], self.input_shape[1]))
        
        # Ensure 0-1 range
        if image.max() > 1.0:
            image = image.astype(np.float32) / 255.0
        
        # Add batch dimension
        return np.expand_dims(image, axis=0)
    
    def predict(self, image: np.ndarray) -> Dict:
        """
        Predict the variety of a chili from image.
        
        Args:
            image: Preprocessed image array
            
        Returns:
            Dictionary with prediction results
        """
        if self.model is None:
            # Mock prediction for development
            return self._mock_prediction()
        
        # Preprocess
        batch = self.preprocess_for_prediction(image)
        
        # Predict
        predictions = self.model.predict(batch, verbose=0)[0]
        
        # Get results
        predicted_idx = np.argmax(predictions)
        predicted_variety = VARIETY_LABELS[predicted_idx]
        confidence = float(predictions[predicted_idx])
        
        probabilities = {
            label: float(prob) 
            for label, prob in zip(VARIETY_LABELS, predictions)
        }
        
        return {
            "predicted_variety": predicted_variety,
            "confidence": confidence,
            "probabilities": probabilities
        }
    
    def predict_batch(self, images: List[np.ndarray]) -> List[Dict]:
        """
        Predict varieties for a batch of images.
        
        Args:
            images: List of preprocessed image arrays
            
        Returns:
            List of prediction results
        """
        if self.model is None:
            return [self._mock_prediction() for _ in images]
        
        # Stack images
        batch = np.stack([
            self.preprocess_for_prediction(img)[0] for img in images
        ])
        
        # Predict
        predictions = self.model.predict(batch, verbose=0)
        
        # Format results
        results = []
        for pred in predictions:
            predicted_idx = np.argmax(pred)
            results.append({
                "predicted_variety": VARIETY_LABELS[predicted_idx],
                "confidence": float(pred[predicted_idx]),
                "probabilities": {
                    label: float(prob)
                    for label, prob in zip(VARIETY_LABELS, pred)
                }
            })
        
        return results
    
    def _mock_prediction(self) -> Dict:
        """
        Generate mock prediction for development/testing.
        """
        import random
        
        # Generate random probabilities
        probs = np.random.dirichlet(np.ones(self.num_classes))
        predicted_idx = np.argmax(probs)
        
        return {
            "predicted_variety": VARIETY_LABELS[predicted_idx],
            "confidence": float(probs[predicted_idx]),
            "probabilities": {
                label: float(prob)
                for label, prob in zip(VARIETY_LABELS, probs)
            }
        }
    
    def get_feature_maps(self, image: np.ndarray, layer_name: str = None) -> np.ndarray:
        """
        Extract feature maps from a specific layer for visualization.
        
        Args:
            image: Input image
            layer_name: Name of the layer to extract from
            
        Returns:
            Feature maps array
        """
        if self.model is None:
            return np.zeros((1, 16, 16, 64))
        
        try:
            from tensorflow import keras
            
            # Get intermediate layer
            if layer_name is None:
                # Use first conv layer
                layer_name = [l.name for l in self.model.layers if 'conv' in l.name.lower()][0]
            
            intermediate_model = keras.Model(
                inputs=self.model.input,
                outputs=self.model.get_layer(layer_name).output
            )
            
            batch = self.preprocess_for_prediction(image)
            feature_maps = intermediate_model.predict(batch, verbose=0)
            
            return feature_maps
            
        except Exception as e:
            logger.error(f"Failed to extract feature maps: {e}")
            return np.zeros((1, 16, 16, 64))
    
    def explain_prediction(self, image: np.ndarray) -> Dict:
        """
        Generate explanation for prediction using Grad-CAM.
        
        Args:
            image: Input image
            
        Returns:
            Dictionary with prediction and heatmap
        """
        prediction = self.predict(image)
        
        if self.model is None:
            # Mock heatmap
            heatmap = np.random.rand(16, 16)
            prediction["heatmap"] = heatmap.tolist()
            return prediction
        
        try:
            from tensorflow import keras
            import tensorflow as tf
            
            batch = self.preprocess_for_prediction(image)
            
            # Get last conv layer
            conv_layers = [l for l in self.model.layers if 'conv' in l.name.lower()]
            if not conv_layers:
                prediction["heatmap"] = None
                return prediction
            
            last_conv_layer = conv_layers[-1]
            
            # Create gradient model
            grad_model = keras.Model(
                inputs=self.model.inputs,
                outputs=[last_conv_layer.output, self.model.output]
            )
            
            # Compute gradients
            with tf.GradientTape() as tape:
                conv_outputs, predictions = grad_model(batch)
                loss = predictions[:, np.argmax(predictions[0])]
            
            grads = tape.gradient(loss, conv_outputs)
            pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))
            
            # Compute heatmap
            conv_outputs = conv_outputs[0]
            heatmap = conv_outputs @ pooled_grads[..., tf.newaxis]
            heatmap = tf.squeeze(heatmap)
            heatmap = tf.maximum(heatmap, 0) / tf.math.reduce_max(heatmap)
            
            prediction["heatmap"] = heatmap.numpy().tolist()
            
        except Exception as e:
            logger.error(f"Failed to generate Grad-CAM: {e}")
            prediction["heatmap"] = None
        
        return prediction
