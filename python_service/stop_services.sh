#!/bin/bash
# Stop script for DWG conversion services

echo "Stopping DWG Conversion Services..."

# Stop Flask API server
echo "Stopping Flask API server..."
pkill -f "api_server.py"

# Stop Celery worker
echo "Stopping Celery worker..."
pkill -f "celery.*celery_app"

# Optional: Stop Redis if you want
# echo "Stopping Redis server..."
# redis-cli shutdown

echo "Services stopped successfully!"
