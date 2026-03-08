# Backend Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0t64 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    libmagic1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY ./app ./app

# Copy Firebase credentials if present (wildcard so build doesn't fail if missing)
COPY firebase-credentials.jso[n] ./

# Create directories for uploads and models
RUN mkdir -p /app/uploads /app/models

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port (Render uses PORT env var, default 10000)
EXPOSE 10000

# Run the application using Render's PORT env var
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
