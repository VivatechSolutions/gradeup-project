FROM python:3.11-slim

# Install system dependencies for OpenCV & Ultralytics
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    git \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy all project files
COPY . /app

# Upgrade pip and install dependencies

RUN pip install --no-cache-dir -r requirements.txt

# Expose port for FastAPI
EXPOSE 5000

# Start FastAPI
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000"]

# RUN pip install --upgrade pip setuptools gitpython
# RUN python -c "import torch; torch.hub.load('ultralytics/yolov5', 'yolov5s', trust_repo=True)"
# Copy .env if exists (optional)
# COPY .env /app/.env
# Avoid interactive prompts
# ENV DEBIAN_FRONTEND=noninteractive