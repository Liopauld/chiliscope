# 🌶️ ChiliScope

## ML-Based Heat Level Recommendation System

A comprehensive full-stack machine learning system that analyzes chili flower morphology to predict fruit heat levels before maturation, enabling early-stage decision-making for farmers, gardeners, and agricultural stakeholders.

![License](https://img.shields.io/badge/license-MIT-green.svg)
![Python](https://img.shields.io/badge/python-3.11+-blue.svg)
![React](https://img.shields.io/badge/react-18.2-blue.svg)
![FastAPI](https://img.shields.io/badge/fastapi-0.104-green.svg)

---

## 📦 Project Structure

```
chili/
├── backend/                 # FastAPI Backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── ml/             # ML models and services
│   │   ├── models/         # Trained model files
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── config.py       # Configuration
│   │   ├── database.py     # MongoDB connection
│   │   ├── main.py         # FastAPI app
│   │   └── security.py     # Authentication
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                # React.js Web App
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── stores/         # Zustand stores
│   │   ├── lib/            # Utilities
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
├── mobile/                  # React Native Mobile App
│   ├── src/
│   │   ├── screens/        # Screen components
│   │   ├── navigation/     # React Navigation
│   │   ├── context/        # Auth context
│   │   └── api/            # API client
│   ├── App.tsx
│   └── package.json
├── ml_training/            # ML Training Notebooks
│   ├── 01_data_preprocessing.ipynb
│   ├── 02_variety_classifier_training.ipynb
│   ├── 03_heat_predictor_training.ipynb
│   └── requirements.txt
├── docker-compose.yml      # Container orchestration
├── init-mongo.js           # Database initialization
└── README.md
```

---

## 🎯 Target Philippine Chili Varieties

| Variety | Local Name | Heat Level |
|---------|------------|------------|
| Long Green Chili | Siling Haba | Mild to Medium (0-15,000 SHU) |
| Bird's Eye Chili | Siling Labuyo | Hot (15,001-50,000 SHU) |
| Demon Chili | Super Labuyo | Extra Hot (50,000+ SHU) |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────┐
│         PRESENTATION LAYER                      │
│  ┌──────────────────┐  ┌──────────────────┐    │
│  │   Web App        │  │  Mobile App      │    │
│  │   (React.js)     │  │  (React Native)  │    │
│  └──────────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│         API GATEWAY LAYER                       │
│         RESTful API (FastAPI)                   │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│         BUSINESS LOGIC LAYER                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │  Image   │  │    ML    │  │  Recom-  │      │
│  │ Process  │  │  Engine  │  │ mendation│      │
│  │ Service  │  │  Service │  │  Service │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│         DATA LAYER                              │
│  ┌──────────────┐  ┌──────────────┐            │
│  │   MongoDB    │  │  Cloud       │            │
│  │   Database   │  │  Storage     │            │
│  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
chili/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/               # API Routes
│   │   ├── core/              # Core configurations
│   │   ├── models/            # Database models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── services/          # Business logic
│   │   └── ml/                # ML models and utilities
│   ├── tests/                 # Backend tests
│   └── requirements.txt
├── frontend/                   # React.js Web App
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API services
│   │   └── store/             # State management
│   └── package.json
├── mobile/                     # React Native App
│   ├── src/
│   │   ├── components/        # Shared components
│   │   ├── screens/           # Screen components
│   │   ├── navigation/        # Navigation config
│   │   ├── services/          # API & offline services
│   │   └── store/             # State management
│   └── package.json
├── ml_training/                # ML Model Training
│   ├── notebooks/             # Jupyter notebooks
│   ├── data/                  # Training data
│   └── models/                # Saved models
└── docs/                       # Documentation
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB 6.0+
- npm or yarn

### Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Mobile Setup
```bash
cd mobile
npm install
npx expo start
```

---

## 🔧 Environment Variables

Create `.env` files in respective directories:

### Backend (.env)
```env
MONGODB_URL=mongodb://localhost:27017
DATABASE_NAME=chili_analyzer
JWT_SECRET_KEY=your-secret-key
AZURE_STORAGE_CONNECTION_STRING=your-azure-connection
AZURE_STORAGE_CONTAINER_NAME=chili-images
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api/v1
```

### Mobile (.env)
```env
EXPO_PUBLIC_API_URL=http://localhost:8000/api/v1
```

---

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-repo/chili-analyzer.git
cd chili-analyzer

# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Access the application
# Web: http://localhost:80
# API: http://localhost:8000
# MongoDB Admin: http://localhost:8081
```

### Manual Setup

#### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

#### Mobile
```bash
cd mobile
npm install
npx expo start
```

---

## 📊 ML Models

| Model | Purpose | Target Metric |
|-------|---------|---------------|
| CNN (EfficientNet) | Variety Classification | ≥90% Accuracy |
| Random Forest | SHU Prediction | ≤5,000 MAE |
| Decision Tree | Maturity Assessment | ≤3 days error |
| Linear Regression | Feature Analysis | Statistical insights |

---

## 📖 API Documentation

Once the backend is running, access the interactive API docs:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | User registration |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/predictions/analyze-image` | Analyze chili image |
| GET | `/api/v1/predictions/history` | Get prediction history |
| GET | `/api/v1/analytics/dashboard` | Dashboard statistics |

---

## 📱 Features

### Web Application
- 📸 Image upload with drag-and-drop
- 🔍 Real-time analysis visualization
- 📊 Interactive dashboards with charts
- 📚 Sample library management
- 👤 User authentication with JWT
- 🎨 Dark/Light theme support

### Mobile Application
- 📷 Camera integration with Expo Camera
- 🖼️ Image picker from gallery
- 🔄 Real-time analysis results
- 📍 GPS location tagging
- 💾 Secure token storage
- 📊 Statistics dashboard

---

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting on API endpoints
- Input validation and sanitization
- CORS configuration
- Secure token storage (SecureStore on mobile)

---

## 🧪 Running Tests

### Backend Tests
```bash
cd backend
pytest --cov=app tests/
```

### Frontend Tests
```bash
cd frontend
npm run test
```

---

## 📄 License

This project is developed for academic purposes under MIT License.

---

## 👥 Contributors

- Development Team - Chili Morphology Analyzer Project

---

## 🙏 Acknowledgments

- Philippine Department of Agriculture for chili variety information
- TensorFlow and scikit-learn communities
- React and FastAPI open-source communities
