"""
ChiliScope ML Model Training Pipeline
======================================

Trains all 3 ML models:
  1. Linear Regression → SHU prediction (Objective 3)
  2. Random Forest Regressor → SHU prediction (Objective 4)
  3. Decision Tree Regressor → Maturity score prediction (Objective 5)

Also produces:
  - Comparative analysis (Objective 6)
  - Model .joblib files for production loading
  - Metadata JSON with full metrics
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import joblib
from datetime import datetime

from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeRegressor, export_text
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    mean_absolute_percentage_error,
)

# Add parent to path so we can import dataset_generator
sys.path.insert(0, os.path.dirname(__file__))
from dataset_generator import generate_shu_dataset, generate_maturity_dataset, VARIETY_PROFILES


# Paths
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)


# Feature columns for SHU prediction
SHU_FEATURES = [
    "variety_code",
    "pod_length_mm",
    "pod_width_mm",
    "pod_weight_g",
    "color_r",
    "color_g",
    "color_b",
    "hue",
    "saturation",
    "value_hsv",
    "maturity_score",
    "flower_stress_score",
]

# Feature columns for maturity prediction
MATURITY_FEATURES = [
    "variety_code",
    "color_r",
    "color_g",
    "color_b",
    "hue",
    "saturation",
    "value_hsv",
    "days_to_maturity",
]


def compute_metrics(y_true, y_pred, prefix=""):
    """Compute regression metrics."""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    mape = mean_absolute_percentage_error(y_true, y_pred) * 100
    return {
        f"{prefix}mae": round(float(mae), 4),
        f"{prefix}rmse": round(float(rmse), 4),
        f"{prefix}r2": round(float(r2), 6),
        f"{prefix}mape_percent": round(float(mape), 2),
    }


def compute_variety_metrics(y_true, y_pred, varieties):
    """Compute metrics per variety."""
    variety_metrics = {}
    for vname in VARIETY_PROFILES.keys():
        mask = varieties == vname
        if mask.sum() == 0:
            continue
        variety_metrics[vname] = compute_metrics(y_true[mask], y_pred[mask])
    return variety_metrics


def train_linear_regression(X_train, y_train, X_test, y_test, feature_names, varieties_test):
    """Train Linear Regression for SHU prediction."""
    print("\n" + "=" * 60)
    print("TRAINING: Linear Regression for SHU Prediction")
    print("=" * 60)

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    model = LinearRegression()
    model.fit(X_train_scaled, y_train)

    y_pred_train = model.predict(X_train_scaled)
    y_pred_test = model.predict(X_test_scaled)

    train_metrics = compute_metrics(y_train, y_pred_train, prefix="train_")
    test_metrics = compute_metrics(y_test, y_pred_test, prefix="test_")
    variety_metrics = compute_variety_metrics(y_test.values, y_pred_test, varieties_test.values)

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_r2 = cross_val_score(model, X_train_scaled, y_train, cv=kf, scoring="r2")
    cv_mae = -cross_val_score(model, X_train_scaled, y_train, cv=kf, scoring="neg_mean_absolute_error")

    coefficients = {fname: round(float(coef), 4) for fname, coef in zip(feature_names, model.coef_)}

    metadata = {
        "model_type": "LinearRegression",
        "target": "shu",
        "features": feature_names,
        "n_train": len(X_train),
        "n_test": len(X_test),
        **train_metrics,
        **test_metrics,
        "cv_r2_mean": round(float(cv_r2.mean()), 6),
        "cv_r2_std": round(float(cv_r2.std()), 6),
        "cv_r2_scores": [round(float(s), 6) for s in cv_r2],
        "cv_mae_mean": round(float(cv_mae.mean()), 4),
        "cv_mae_std": round(float(cv_mae.std()), 4),
        "coefficients": coefficients,
        "intercept": round(float(model.intercept_), 4),
        "variety_metrics": variety_metrics,
        "trained_at": datetime.now().isoformat(),
    }

    joblib.dump(model, os.path.join(MODELS_DIR, "linear_regression_shu.joblib"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "linear_regression_scaler.joblib"))
    with open(os.path.join(MODELS_DIR, "linear_regression_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"  Train R²: {metadata['train_r2']:.4f}")
    print(f"  Test  R²: {metadata['test_r2']:.4f}")
    print(f"  Test MAE: {metadata['test_mae']:.1f} SHU")
    print(f"  Test RMSE: {metadata['test_rmse']:.1f} SHU")
    print(f"  CV R² (5-fold): {metadata['cv_r2_mean']:.4f} ± {metadata['cv_r2_std']:.4f}")
    sorted_coefs = sorted(coefficients.items(), key=lambda x: abs(x[1]), reverse=True)
    print(f"  Top coefficients:")
    for name, coef in sorted_coefs[:5]:
        print(f"    {name}: {coef:.4f}")

    return model, scaler, metadata


def train_random_forest(X_train, y_train, X_test, y_test, feature_names, varieties_test):
    """Train Random Forest Regressor for SHU prediction."""
    print("\n" + "=" * 60)
    print("TRAINING: Random Forest Regressor for SHU Prediction")
    print("=" * 60)

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=3,
        max_features="sqrt",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)

    train_metrics = compute_metrics(y_train, y_pred_train, prefix="train_")
    test_metrics = compute_metrics(y_test, y_pred_test, prefix="test_")
    variety_metrics = compute_variety_metrics(y_test.values, y_pred_test, varieties_test.values)

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_r2 = cross_val_score(model, X_train, y_train, cv=kf, scoring="r2")
    cv_mae = -cross_val_score(model, X_train, y_train, cv=kf, scoring="neg_mean_absolute_error")

    importances = {fname: round(float(imp), 6) for fname, imp in zip(feature_names, model.feature_importances_)}

    metadata = {
        "model_type": "RandomForestRegressor",
        "target": "shu",
        "features": feature_names,
        "n_train": len(X_train),
        "n_test": len(X_test),
        "hyperparameters": {
            "n_estimators": 200,
            "max_depth": 15,
            "min_samples_split": 5,
            "min_samples_leaf": 3,
            "max_features": "sqrt",
        },
        **train_metrics,
        **test_metrics,
        "cv_r2_mean": round(float(cv_r2.mean()), 6),
        "cv_r2_std": round(float(cv_r2.std()), 6),
        "cv_r2_scores": [round(float(s), 6) for s in cv_r2],
        "cv_mae_mean": round(float(cv_mae.mean()), 4),
        "cv_mae_std": round(float(cv_mae.std()), 4),
        "feature_importances": importances,
        "variety_metrics": variety_metrics,
        "trained_at": datetime.now().isoformat(),
    }

    joblib.dump(model, os.path.join(MODELS_DIR, "random_forest_shu.joblib"))
    with open(os.path.join(MODELS_DIR, "random_forest_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"  Train R²: {metadata['train_r2']:.4f}")
    print(f"  Test  R²: {metadata['test_r2']:.4f}")
    print(f"  Test MAE: {metadata['test_mae']:.1f} SHU")
    print(f"  Test RMSE: {metadata['test_rmse']:.1f} SHU")
    print(f"  CV R² (5-fold): {metadata['cv_r2_mean']:.4f} ± {metadata['cv_r2_std']:.4f}")
    sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    print(f"  Top feature importances:")
    for name, imp in sorted_imp[:5]:
        print(f"    {name}: {imp:.4f}")

    return model, metadata


def train_decision_tree_maturity(X_train, y_train, X_test, y_test, feature_names, varieties_test):
    """Train Decision Tree Regressor for maturity score prediction."""
    print("\n" + "=" * 60)
    print("TRAINING: Decision Tree Regressor for Maturity Prediction")
    print("=" * 60)

    model = DecisionTreeRegressor(
        max_depth=8,
        min_samples_split=10,
        min_samples_leaf=5,
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_pred_train = model.predict(X_train)
    y_pred_test = model.predict(X_test)

    train_metrics = compute_metrics(y_train, y_pred_train, prefix="train_")
    test_metrics = compute_metrics(y_test, y_pred_test, prefix="test_")
    variety_metrics = compute_variety_metrics(y_test.values, y_pred_test, varieties_test.values)

    kf = KFold(n_splits=5, shuffle=True, random_state=42)
    cv_r2 = cross_val_score(model, X_train, y_train, cv=kf, scoring="r2")
    cv_mae = -cross_val_score(model, X_train, y_train, cv=kf, scoring="neg_mean_absolute_error")

    importances = {fname: round(float(imp), 6) for fname, imp in zip(feature_names, model.feature_importances_)}

    tree_rules = export_text(model, feature_names=feature_names, max_depth=5)
    harvest_rules = _extract_harvest_rules(model, feature_names)

    metadata = {
        "model_type": "DecisionTreeRegressor",
        "target": "maturity_score",
        "features": feature_names,
        "n_train": len(X_train),
        "n_test": len(X_test),
        "hyperparameters": {
            "max_depth": 8,
            "min_samples_split": 10,
            "min_samples_leaf": 5,
        },
        **train_metrics,
        **test_metrics,
        "cv_r2_mean": round(float(cv_r2.mean()), 6),
        "cv_r2_std": round(float(cv_r2.std()), 6),
        "cv_r2_scores": [round(float(s), 6) for s in cv_r2],
        "cv_mae_mean": round(float(cv_mae.mean()), 4),
        "cv_mae_std": round(float(cv_mae.std()), 4),
        "feature_importances": importances,
        "variety_metrics": variety_metrics,
        "tree_depth": int(model.get_depth()),
        "n_leaves": int(model.get_n_leaves()),
        "decision_rules_preview": tree_rules[:2000],
        "harvest_readiness_rules": harvest_rules,
        "trained_at": datetime.now().isoformat(),
    }

    joblib.dump(model, os.path.join(MODELS_DIR, "decision_tree_maturity.joblib"))
    with open(os.path.join(MODELS_DIR, "decision_tree_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)
    with open(os.path.join(MODELS_DIR, "decision_tree_rules.txt"), "w") as f:
        f.write(export_text(model, feature_names=feature_names))

    print(f"  Train R²: {metadata['train_r2']:.4f}")
    print(f"  Test  R²: {metadata['test_r2']:.4f}")
    print(f"  Test MAE: {metadata['test_mae']:.4f}")
    print(f"  Test RMSE: {metadata['test_rmse']:.4f}")
    print(f"  CV R² (5-fold): {metadata['cv_r2_mean']:.4f} ± {metadata['cv_r2_std']:.4f}")
    print(f"  Tree depth: {metadata['tree_depth']}, leaves: {metadata['n_leaves']}")
    sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)
    print(f"  Top feature importances:")
    for name, imp in sorted_imp[:5]:
        print(f"    {name}: {imp:.4f}")

    return model, metadata


def _extract_harvest_rules(model, feature_names):
    """Extract interpretable harvest-readiness rules from the decision tree."""
    rules = []
    tree = model.tree_

    def _recurse(node_id, conditions):
        if tree.children_left[node_id] == tree.children_right[node_id]:
            pred = round(float(tree.value[node_id][0][0]), 3)
            n_samples = int(tree.n_node_samples[node_id])
            if pred >= 0.5:
                stage = "Overripe" if pred >= 0.85 else "Mature/Ready"
                rules.append({
                    "conditions": conditions.copy(),
                    "predicted_maturity": pred,
                    "stage": stage,
                    "n_samples": n_samples,
                })
            return

        feature_idx = tree.feature[node_id]
        threshold = round(float(tree.threshold[node_id]), 2)
        fname = feature_names[feature_idx]

        _recurse(tree.children_left[node_id], conditions + [f"{fname} <= {threshold}"])
        _recurse(tree.children_right[node_id], conditions + [f"{fname} > {threshold}"])

    _recurse(0, [])
    rules.sort(key=lambda x: x["n_samples"], reverse=True)
    return rules[:10]


def run_comparative_analysis(lr_meta, rf_meta, dt_meta):
    """Generate comparative analysis across all 3 models (Objective 6)."""
    print("\n" + "=" * 60)
    print("COMPARATIVE ANALYSIS (Objective 6)")
    print("=" * 60)

    comparison = {
        "analysis_date": datetime.now().isoformat(),
        "shu_models": {
            "linear_regression": {
                "test_r2": lr_meta["test_r2"],
                "test_mae": lr_meta["test_mae"],
                "test_rmse": lr_meta["test_rmse"],
                "test_mape_percent": lr_meta["test_mape_percent"],
                "cv_r2_mean": lr_meta["cv_r2_mean"],
                "cv_r2_std": lr_meta["cv_r2_std"],
                "cv_r2_scores": lr_meta["cv_r2_scores"],
                "variety_metrics": lr_meta["variety_metrics"],
            },
            "random_forest": {
                "test_r2": rf_meta["test_r2"],
                "test_mae": rf_meta["test_mae"],
                "test_rmse": rf_meta["test_rmse"],
                "test_mape_percent": rf_meta["test_mape_percent"],
                "cv_r2_mean": rf_meta["cv_r2_mean"],
                "cv_r2_std": rf_meta["cv_r2_std"],
                "cv_r2_scores": rf_meta["cv_r2_scores"],
                "variety_metrics": rf_meta["variety_metrics"],
            },
        },
        "maturity_model": {
            "decision_tree": {
                "test_r2": dt_meta["test_r2"],
                "test_mae": dt_meta["test_mae"],
                "test_rmse": dt_meta["test_rmse"],
                "test_mape_percent": dt_meta["test_mape_percent"],
                "cv_r2_mean": dt_meta["cv_r2_mean"],
                "cv_r2_std": dt_meta["cv_r2_std"],
                "cv_r2_scores": dt_meta["cv_r2_scores"],
                "variety_metrics": dt_meta["variety_metrics"],
                "tree_depth": dt_meta["tree_depth"],
                "n_leaves": dt_meta["n_leaves"],
            },
        },
        "best_shu_model": (
            "random_forest" if rf_meta["test_r2"] > lr_meta["test_r2"]
            else "linear_regression"
        ),
        "summary": {
            "lr_vs_rf_r2_improvement": round(rf_meta["test_r2"] - lr_meta["test_r2"], 6),
            "lr_vs_rf_mae_reduction": round(lr_meta["test_mae"] - rf_meta["test_mae"], 4),
            "lr_vs_rf_rmse_reduction": round(lr_meta["test_rmse"] - rf_meta["test_rmse"], 4),
        },
    }

    with open(os.path.join(MODELS_DIR, "comparative_analysis.json"), "w") as f:
        json.dump(comparison, f, indent=2)

    print(f"\n  SHU PREDICTION COMPARISON:")
    print(f"  {'Metric':<20} {'Linear Reg':<15} {'Random Forest':<15}")
    print(f"  {'-'*50}")
    print(f"  {'R²':<20} {lr_meta['test_r2']:<15.4f} {rf_meta['test_r2']:<15.4f}")
    print(f"  {'MAE (SHU)':<20} {lr_meta['test_mae']:<15.1f} {rf_meta['test_mae']:<15.1f}")
    print(f"  {'RMSE (SHU)':<20} {lr_meta['test_rmse']:<15.1f} {rf_meta['test_rmse']:<15.1f}")
    print(f"  {'MAPE (%)':<20} {lr_meta['test_mape_percent']:<15.2f} {rf_meta['test_mape_percent']:<15.2f}")
    print(f"  {'CV R² (mean)':<20} {lr_meta['cv_r2_mean']:<15.4f} {rf_meta['cv_r2_mean']:<15.4f}")

    print(f"\n  MATURITY PREDICTION (Decision Tree):")
    print(f"  R²: {dt_meta['test_r2']:.4f}")
    print(f"  MAE: {dt_meta['test_mae']:.4f}")
    print(f"  RMSE: {dt_meta['test_rmse']:.4f}")
    print(f"\n  Best SHU model: {comparison['best_shu_model']}")

    return comparison


def main():
    """Main training pipeline."""
    print("=" * 60)
    print("ChiliScope ML Model Training Pipeline")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # ── 1. Generate datasets ────────────────────────────────────────
    print("\n[1/5] Generating datasets...")
    shu_df = generate_shu_dataset(samples_per_variety=200, random_seed=42)
    mat_df = generate_maturity_dataset(samples_per_variety=200, random_seed=42)

    shu_df.to_csv(os.path.join(DATA_DIR, "shu_dataset.csv"), index=False)
    mat_df.to_csv(os.path.join(DATA_DIR, "maturity_dataset.csv"), index=False)
    print(f"  SHU dataset: {len(shu_df)} samples ({len(shu_df)//3} per variety)")
    print(f"  Maturity dataset: {len(mat_df)} samples")
    print(f"  SHU range: {shu_df['shu'].min():.0f} – {shu_df['shu'].max():.0f}")

    # ── 2. Prepare train/test splits ────────────────────────────────
    print("\n[2/5] Preparing train/test splits...")
    X_shu = shu_df[SHU_FEATURES]
    y_shu = shu_df["shu"]
    varieties_shu = shu_df["variety"]

    X_shu_train, X_shu_test, y_shu_train, y_shu_test, var_train, var_test = train_test_split(
        X_shu, y_shu, varieties_shu, test_size=0.2, random_state=42, stratify=shu_df["variety"]
    )
    print(f"  SHU train: {len(X_shu_train)}, test: {len(X_shu_test)}")

    X_mat = mat_df[MATURITY_FEATURES]
    y_mat = mat_df["maturity_score"]
    varieties_mat = mat_df["variety"]

    X_mat_train, X_mat_test, y_mat_train, y_mat_test, var_mat_train, var_mat_test = train_test_split(
        X_mat, y_mat, varieties_mat, test_size=0.2, random_state=42, stratify=mat_df["variety"]
    )
    print(f"  Maturity train: {len(X_mat_train)}, test: {len(X_mat_test)}")

    # ── 3. Train models ─────────────────────────────────────────────
    print("\n[3/5] Training models...")
    lr_model, lr_scaler, lr_meta = train_linear_regression(
        X_shu_train, y_shu_train, X_shu_test, y_shu_test, SHU_FEATURES, var_test
    )
    rf_model, rf_meta = train_random_forest(
        X_shu_train, y_shu_train, X_shu_test, y_shu_test, SHU_FEATURES, var_test
    )
    dt_model, dt_meta = train_decision_tree_maturity(
        X_mat_train, y_mat_train, X_mat_test, y_mat_test, MATURITY_FEATURES, var_mat_test
    )

    # ── 4. Comparative analysis ──────────────────────────────────────
    print("\n[4/5] Running comparative analysis...")
    comparison = run_comparative_analysis(lr_meta, rf_meta, dt_meta)

    # ── 5. Summary ───────────────────────────────────────────────────
    print("\n[5/5] TRAINING COMPLETE")
    print("=" * 60)
    print("Saved files:")
    for fname in sorted(os.listdir(MODELS_DIR)):
        fpath = os.path.join(MODELS_DIR, fname)
        size_kb = os.path.getsize(fpath) / 1024
        print(f"  {fname} ({size_kb:.1f} KB)")

    print("\nAll models ready for production use.")
    return lr_model, rf_model, dt_model, comparison


if __name__ == "__main__":
    main()
