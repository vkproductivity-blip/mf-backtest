# Use a stable Python base image for the backend
FROM python:3.12-slim

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./
RUN python -m pip install --upgrade pip && python -m pip install -r requirements.txt

# Copy the backend source
COPY backend/ ./

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
