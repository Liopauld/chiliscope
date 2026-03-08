# ML Training for ChiliScope

This directory contains Jupyter notebooks for training the machine learning models used in ChiliScope.

## Notebooks

1. **01_data_preprocessing.ipynb** - Data loading, cleaning, and augmentation
2. **02_variety_classifier_training.ipynb** - CNN model training for variety classification
3. **03_heat_predictor_training.ipynb** - Regression models for SHU prediction
4. **04_model_evaluation.ipynb** - Comprehensive model evaluation and comparison

## Dataset Structure

```
data/
├── raw/
│   ├── siling_haba/
│   │   ├── flower/
│   │   └── fruit/
│   ├── siling_labuyo/
│   │   ├── flower/
│   │   └── fruit/
│   └── super_labuyo/
│       ├── flower/
│       └── fruit/
├── processed/
│   ├── train/
│   ├── val/
│   └── test/
└── metadata.csv
```

## Requirements

```bash
pip install -r requirements.txt
```

## Running the Notebooks

```bash
cd ml_training
jupyter lab
```

## Model Outputs

Trained models will be saved to:
- `../backend/app/models/variety_classifier.h5`
- `../backend/app/models/heat_predictor.pkl`
- `../backend/app/models/maturity_predictor.pkl`
