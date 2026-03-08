"""
Synthetic Dataset Generator for ChiliScope ML Models
=====================================================

Generates training data for SHU prediction and maturity scoring models
based on published morphological and capsaicin data for Philippine chili varieties.

References:
- Bosland & Votava (2012). Peppers: Vegetable and Spice Capsicums.
- Toontom et al. (2012). Capsaicinoid content in fresh and dried Thai chili varieties.
- PCAARRD Philippine Chili Pepper Research Compendium.
- DOST-ITDI Capsaicin Studies on Siling Labuyo.

Key biological principle:
  Smaller pods generally have higher capsaicin concentration per unit weight.
  Within each variety, smaller/lighter pods at full maturity tend to be hotter.
  Mature (red) pods have higher capsaicin than immature (green) pods.
  Flower stress indicators (from stress classifier) correlate positively with
  capsaicin production — stressed plants produce more capsaicin as a defense mechanism.
"""

import numpy as np
import pandas as pd
from typing import Optional


# ── Variety profiles based on published literature ──────────────────────
VARIETY_PROFILES = {
    "Siling Haba": {
        "pod_length_mm": {"mean": 100.0, "std": 25.0, "min": 55.0, "max": 160.0},
        "pod_width_mm": {"mean": 16.0, "std": 4.0, "min": 8.0, "max": 28.0},
        "pod_weight_g": {"mean": 12.0, "std": 4.5, "min": 4.0, "max": 22.0},
        "color_r": {"mean": 140, "std": 60, "min": 30, "max": 230},
        "color_g": {"mean": 100, "std": 50, "min": 20, "max": 200},
        "color_b": {"mean": 35, "std": 15, "min": 10, "max": 70},
        "hue": {"mean": 40, "std": 30, "min": 0, "max": 120},
        "saturation": {"mean": 180, "std": 40, "min": 80, "max": 255},
        "value_hsv": {"mean": 160, "std": 40, "min": 80, "max": 230},
        "days_to_maturity": {"mean": 75, "std": 10, "min": 55, "max": 95},
        "shu_range": (5000, 30000),
        "size_shu_correlation": -0.4,       # smaller → hotter
        "maturity_shu_correlation": 0.5,     # more mature → hotter
        "stress_shu_correlation": 0.25,      # more stress → hotter
        "variety_code": 0,
    },
    "Siling Labuyo": {
        "pod_length_mm": {"mean": 28.0, "std": 7.0, "min": 12.0, "max": 45.0},
        "pod_width_mm": {"mean": 7.0, "std": 1.5, "min": 4.0, "max": 12.0},
        "pod_weight_g": {"mean": 2.5, "std": 0.8, "min": 0.8, "max": 5.0},
        "color_r": {"mean": 195, "std": 40, "min": 80, "max": 240},
        "color_g": {"mean": 55, "std": 35, "min": 10, "max": 160},
        "color_b": {"mean": 25, "std": 12, "min": 5, "max": 55},
        "hue": {"mean": 15, "std": 20, "min": 0, "max": 90},
        "saturation": {"mean": 210, "std": 30, "min": 120, "max": 255},
        "value_hsv": {"mean": 190, "std": 35, "min": 100, "max": 240},
        "days_to_maturity": {"mean": 65, "std": 8, "min": 50, "max": 85},
        "shu_range": (80000, 100000),
        "size_shu_correlation": -0.35,
        "maturity_shu_correlation": 0.45,
        "stress_shu_correlation": 0.20,
        "variety_code": 1,
    },
    "Siling Demonyo": {
        "pod_length_mm": {"mean": 48.0, "std": 12.0, "min": 25.0, "max": 75.0},
        "pod_width_mm": {"mean": 11.0, "std": 2.5, "min": 6.0, "max": 18.0},
        "pod_weight_g": {"mean": 5.0, "std": 2.0, "min": 1.5, "max": 10.0},
        "color_r": {"mean": 210, "std": 30, "min": 100, "max": 245},
        "color_g": {"mean": 40, "std": 25, "min": 5, "max": 120},
        "color_b": {"mean": 20, "std": 10, "min": 5, "max": 50},
        "hue": {"mean": 10, "std": 15, "min": 0, "max": 60},
        "saturation": {"mean": 220, "std": 25, "min": 140, "max": 255},
        "value_hsv": {"mean": 200, "std": 30, "min": 110, "max": 245},
        "days_to_maturity": {"mean": 70, "std": 9, "min": 52, "max": 90},
        "shu_range": (100000, 350000),
        "size_shu_correlation": -0.45,
        "maturity_shu_correlation": 0.55,
        "stress_shu_correlation": 0.30,
        "variety_code": 2,
    },
}

# Maturity stages based on color (HSV hue ranges & days)
MATURITY_STAGES = {
    "immature_green": {"score_range": (0.0, 0.25), "hue_range": (60, 120), "day_fraction": (0.3, 0.5)},
    "developing": {"score_range": (0.25, 0.50), "hue_range": (30, 70), "day_fraction": (0.5, 0.7)},
    "mature": {"score_range": (0.50, 0.85), "hue_range": (5, 35), "day_fraction": (0.7, 0.9)},
    "overripe": {"score_range": (0.85, 1.0), "hue_range": (0, 15), "day_fraction": (0.9, 1.1)},
}


def generate_shu_dataset(
    samples_per_variety: int = 200,
    random_seed: int = 42,
    noise_level: float = 0.08
) -> pd.DataFrame:
    """
    Generate a synthetic dataset for SHU prediction based on published literature.

    The SHU for each sample is computed from:
      - Inverse pod size (smaller pods → higher SHU concentration)
      - Maturity level (redder/more mature → higher SHU)
      - Flower stress level (stressed plants → more capsaicin)
      - Random biological variation

    Args:
        samples_per_variety: Number of samples per variety
        random_seed: For reproducibility
        noise_level: Proportion of random noise (0.0 = deterministic, 0.1 = 10%)

    Returns:
        DataFrame with all features + target SHU column
    """
    np.random.seed(random_seed)
    all_samples = []

    for variety_name, profile in VARIETY_PROFILES.items():
        n = samples_per_variety
        shu_min, shu_max = profile["shu_range"]

        # Generate morphological features (clipped to realistic ranges)
        pod_length = np.clip(
            np.random.normal(profile["pod_length_mm"]["mean"], profile["pod_length_mm"]["std"], n),
            profile["pod_length_mm"]["min"], profile["pod_length_mm"]["max"]
        )
        pod_width = np.clip(
            np.random.normal(profile["pod_width_mm"]["mean"], profile["pod_width_mm"]["std"], n),
            profile["pod_width_mm"]["min"], profile["pod_width_mm"]["max"]
        )
        pod_weight = np.clip(
            np.random.normal(profile["pod_weight_g"]["mean"], profile["pod_weight_g"]["std"], n),
            profile["pod_weight_g"]["min"], profile["pod_weight_g"]["max"]
        )

        # Generate color features
        color_r = np.clip(
            np.random.normal(profile["color_r"]["mean"], profile["color_r"]["std"], n),
            profile["color_r"]["min"], profile["color_r"]["max"]
        ).astype(int)
        color_g = np.clip(
            np.random.normal(profile["color_g"]["mean"], profile["color_g"]["std"], n),
            profile["color_g"]["min"], profile["color_g"]["max"]
        ).astype(int)
        color_b = np.clip(
            np.random.normal(profile["color_b"]["mean"], profile["color_b"]["std"], n),
            profile["color_b"]["min"], profile["color_b"]["max"]
        ).astype(int)
        hue = np.clip(
            np.random.normal(profile["hue"]["mean"], profile["hue"]["std"], n),
            profile["hue"]["min"], profile["hue"]["max"]
        )
        saturation = np.clip(
            np.random.normal(profile["saturation"]["mean"], profile["saturation"]["std"], n),
            profile["saturation"]["min"], profile["saturation"]["max"]
        )
        value_hsv = np.clip(
            np.random.normal(profile["value_hsv"]["mean"], profile["value_hsv"]["std"], n),
            profile["value_hsv"]["min"], profile["value_hsv"]["max"]
        )

        # Generate days to maturity
        days = np.clip(
            np.random.normal(profile["days_to_maturity"]["mean"], profile["days_to_maturity"]["std"], n),
            profile["days_to_maturity"]["min"], profile["days_to_maturity"]["max"]
        )

        # Flower stress score: 0.0 = healthy, 1.0 = highly stressed
        # Bimodal distribution: ~60% healthy (low stress), ~40% moderate stress
        stress_score = np.zeros(n)
        n_stressed = int(n * 0.4)
        stress_score[:n_stressed] = np.clip(np.random.beta(2, 3, n_stressed) * 0.5 + 0.5, 0.3, 1.0)
        stress_score[n_stressed:] = np.clip(np.random.beta(3, 2, n - n_stressed) * 0.3, 0.0, 0.35)
        np.random.shuffle(stress_score)

        # Compute maturity score (0-1)
        hue_max = profile["hue"]["max"]
        hue_maturity = 1.0 - (hue / max(hue_max, 1))   # 0=green, 1=red
        day_min = profile["days_to_maturity"]["min"]
        day_max = profile["days_to_maturity"]["max"]
        day_maturity = (days - day_min) / max(day_max - day_min, 1)
        maturity_score = np.clip(0.6 * hue_maturity + 0.4 * day_maturity, 0.0, 1.0)

        # Normalize pod size: 0 = smallest, 1 = largest within variety
        length_norm = (pod_length - profile["pod_length_mm"]["min"]) / (
            profile["pod_length_mm"]["max"] - profile["pod_length_mm"]["min"]
        )
        width_norm = (pod_width - profile["pod_width_mm"]["min"]) / (
            profile["pod_width_mm"]["max"] - profile["pod_width_mm"]["min"]
        )
        weight_norm = (pod_weight - profile["pod_weight_g"]["min"]) / (
            profile["pod_weight_g"]["max"] - profile["pod_weight_g"]["min"]
        )
        size_composite = (length_norm + width_norm + weight_norm) / 3.0

        # Size effect: smaller pods → higher SHU fraction
        size_effect = profile["size_shu_correlation"] * size_composite
        # Maturity effect: more mature → higher SHU
        maturity_effect = profile["maturity_shu_correlation"] * maturity_score
        # Stress effect: more stress → higher SHU (defense mechanism)
        stress_effect = profile["stress_shu_correlation"] * stress_score

        # Combined fraction (centered around 0.5, shifted by effects)
        base_fraction = 0.5 + size_effect + maturity_effect + stress_effect

        # Add biological noise
        noise = np.random.normal(0, noise_level, n)
        shu_fraction = np.clip(base_fraction + noise, 0.0, 1.0)

        # Compute actual SHU
        shu = shu_min + shu_fraction * (shu_max - shu_min)

        for i in range(n):
            all_samples.append({
                "variety": variety_name,
                "variety_code": profile["variety_code"],
                "pod_length_mm": round(pod_length[i], 1),
                "pod_width_mm": round(pod_width[i], 1),
                "pod_weight_g": round(pod_weight[i], 2),
                "color_r": int(color_r[i]),
                "color_g": int(color_g[i]),
                "color_b": int(color_b[i]),
                "hue": round(float(hue[i]), 1),
                "saturation": round(float(saturation[i]), 1),
                "value_hsv": round(float(value_hsv[i]), 1),
                "days_to_maturity": round(float(days[i]), 0),
                "maturity_score": round(float(maturity_score[i]), 4),
                "flower_stress_score": round(float(stress_score[i]), 4),
                "shu": round(float(shu[i]), 0),
            })

    df = pd.DataFrame(all_samples)
    return df


def generate_maturity_dataset(
    samples_per_variety: int = 200,
    random_seed: int = 42,
    noise_level: float = 0.06
) -> pd.DataFrame:
    """
    Generate a dataset specifically for maturity score prediction.
    Features: color_r, color_g, color_b, hue, saturation, value_hsv,
              days_to_maturity, variety_code
    Target: maturity_score (0.0 to 1.0 continuous)
    """
    np.random.seed(random_seed)
    all_samples = []

    for variety_name, profile in VARIETY_PROFILES.items():
        n = samples_per_variety
        stage_names = list(MATURITY_STAGES.keys())
        samples_per_stage = n // len(stage_names)

        for stage_name in stage_names:
            stage = MATURITY_STAGES[stage_name]
            s = samples_per_stage

            score_min, score_max = stage["score_range"]
            hue_min, hue_max = stage["hue_range"]
            day_frac_min, day_frac_max = stage["day_fraction"]

            maturity_scores = np.random.uniform(score_min, score_max, s)

            hue_vals = np.clip(np.random.uniform(hue_min, hue_max, s), 0, 179)

            # Red increases with maturity, green decreases
            redness_factor = maturity_scores
            color_r = np.clip(60 + 180 * redness_factor + np.random.normal(0, 15, s), 0, 255).astype(int)
            color_g = np.clip(180 - 150 * redness_factor + np.random.normal(0, 20, s), 0, 255).astype(int)
            color_b = np.clip(30 + np.random.normal(0, 10, s), 5, 80).astype(int)

            saturation_vals = np.clip(
                np.random.normal(profile["saturation"]["mean"], profile["saturation"]["std"], s),
                profile["saturation"]["min"], profile["saturation"]["max"]
            )
            value_vals = np.clip(
                np.random.normal(profile["value_hsv"]["mean"], profile["value_hsv"]["std"], s),
                profile["value_hsv"]["min"], profile["value_hsv"]["max"]
            )

            day_min = profile["days_to_maturity"]["min"]
            day_max = profile["days_to_maturity"]["max"]
            total_days_range = day_max - day_min
            days = np.clip(
                day_min + total_days_range * np.random.uniform(day_frac_min, day_frac_max, s)
                + np.random.normal(0, 2, s),
                day_min, day_max + 5
            )

            maturity_scores_noisy = np.clip(
                maturity_scores + np.random.normal(0, noise_level, s),
                0.0, 1.0
            )

            for i in range(s):
                all_samples.append({
                    "variety": variety_name,
                    "variety_code": profile["variety_code"],
                    "color_r": int(color_r[i]),
                    "color_g": int(color_g[i]),
                    "color_b": int(color_b[i]),
                    "hue": round(float(hue_vals[i]), 1),
                    "saturation": round(float(saturation_vals[i]), 1),
                    "value_hsv": round(float(value_vals[i]), 1),
                    "days_to_maturity": round(float(days[i]), 0),
                    "maturity_score": round(float(maturity_scores_noisy[i]), 4),
                    "stage": stage_name,
                })

    return pd.DataFrame(all_samples)
