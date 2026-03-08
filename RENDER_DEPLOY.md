# Deploying ChiliScope to Render (Free Tier)

## Prerequisites

- A [Render account](https://render.com) (sign up free)
- This repo pushed to **GitHub** (public or private)

---

## Option A — One-Click Blueprint Deploy

1. Push your code to GitHub (make sure `render.yaml` is at the repo root).
2. Go to <https://dashboard.render.com/blueprints> → **New Blueprint Instance**.
3. Connect your GitHub repo.
4. Render will detect `render.yaml` and show two services:
   - **chiliscope-api** (Web Service — Docker)
   - **chiliscope-web** (Static Site)
5. Fill in the **`sync: false`** env vars (marked "set manually"):

   | Variable | Where to get it |
   |---|---|
   | `MONGODB_URL` | Your MongoDB Atlas connection string |
   | `ROBOFLOW_API_KEY` | Roboflow project → Settings → API Key (`DUwRRuYzqU2HllvABXDp`) |
   | `ROBOFLOW_CHILI_SEGMENTATION_API_KEY` | Chili segmentation Roboflow key (`MQR0xXBdPgD0z0g8nBT4`) |
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary dashboard |
   | `CLOUDINARY_API_KEY` | Cloudinary dashboard |
   | `CLOUDINARY_API_SECRET` | Cloudinary dashboard |
   | `GEMINI_API_KEY` | Google AI Studio |

6. Click **Apply** — Render builds & deploys both services.

---

## Option B — Manual Setup

### 1. Deploy the Backend (Web Service)

1. Render Dashboard → **New → Web Service**.
2. Connect your GitHub repo.
3. Settings:
   - **Name**: `chiliscope-api`
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Instance Type**: Free
   - **Health Check Path**: `/health`
4. **Environment Variables** — add all keys listed in `render.yaml` under `chiliscope-api.envVars`. The most important ones:
   ```
   MONGODB_URL=mongodb+srv://...
   DATABASE_NAME=chiliscope
   JWT_SECRET_KEY=<generate a strong random string>
   ENVIRONMENT=production
   DEBUG=False
   CORS_ORIGINS=["*"]
   ROBOFLOW_API_KEY=DUwRRuYzqU2HllvABXDp
   ROBOFLOW_CHILI_SEGMENTATION_API_KEY=MQR0xXBdPgD0z0g8nBT4
   CLOUDINARY_CLOUD_NAME=dk5y69min
   CLOUDINARY_API_KEY=517127826318265
   CLOUDINARY_API_SECRET=O8fz_RJwSL1bP8v8KLAhIboSzSQ
   GEMINI_API_KEY=AIzaSyAE_BLd88QhlHfVQDB32S6gtgrGcxvw_AU
   FIREBASE_CREDENTIALS_PATH=firebase-credentials.json
   FIREBASE_PROJECT_ID=chiliscope-65628
   ```
5. Click **Deploy**.
6. Note the URL (e.g. `https://chiliscope-api.onrender.com`).

### 2. Deploy the Frontend (Static Site)

1. Render Dashboard → **New → Static Site**.
2. Connect the same repo.
3. Settings:
   - **Name**: `chiliscope-web`
   - **Build Command**: `cd frontend && npm ci && npm run build`
   - **Publish Directory**: `frontend/dist`
4. **Environment Variables**:
   ```
   VITE_API_URL=https://chiliscope-api.onrender.com/api/v1
   ```
   *(Replace with your actual backend URL from step 1.6)*
5. **Rewrite Rules** (under Redirects/Rewrites):
   - Source: `/api/*` → Destination: `https://chiliscope-api.onrender.com/api/*` (Rewrite)
   - Source: `/*` → Destination: `/index.html` (Rewrite) — for SPA routing
6. Click **Deploy**.

---

## MongoDB Atlas — Allow Render IPs

Render uses dynamic IPs on the free tier. In MongoDB Atlas:

1. Go to **Network Access** → **Add IP Address**.
2. Add `0.0.0.0/0` (allow from anywhere) **or** add
   [Render's static outbound IPs](https://render.com/docs/static-outbound-ip-addresses)
   if you're on a paid plan.

---

## After Deployment

| What | URL |
|---|---|
| Backend API | `https://chiliscope-api.onrender.com/api/v1` |
| Frontend | `https://chiliscope-web.onrender.com` |
| Health check | `https://chiliscope-api.onrender.com/health` |
| API docs (Swagger) | `https://chiliscope-api.onrender.com/docs` |

### Mobile app config

Update `mobile/.env`:
```
EXPO_PUBLIC_API_URL=https://chiliscope-api.onrender.com/api/v1
```

---

## ⚠ Free Tier Limitations

- **Spin-down**: Free services sleep after 15 min of inactivity. First request after sleep takes ~30–60 s.
- **Build time**: The backend Docker image includes TensorFlow + OpenCV (~2 GB). Builds may take 10–15 min.
- **RAM**: Free tier has 512 MB. TensorFlow may use significant memory.
- **Bandwidth**: 100 GB/month on free tier.

If you hit memory limits, consider upgrading to the **Starter** plan ($7/month) for 512 MB guaranteed RAM and no spin-down.

---

## Updating

Push to your connected GitHub branch — Render auto-deploys on every push.
