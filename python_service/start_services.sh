#!/bin/bash
# Start script for DWG conversion services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting DWG Conversion Services..."

# Start Redis (if not already running)
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Starting Redis server..."
    redis-server --daemonize yes
fi

# Start Celery worker in background
echo "Starting Celery worker..."
cd "$SCRIPT_DIR"
celery -A celery_app worker --loglevel=info --logfile=/tmp/celery_worker.log --detach

# Wait a moment for worker to start
sleep 2

# Start Flask API server
echo "Starting Flask API server..."
python3 api_server.py &
FLASK_PID=$!

echo "Services started successfully!"
echo "Flask API PID: $FLASK_PID"
echo "Celery worker logs: /tmp/celery_worker.log"
echo ""
echo "To stop services, run: ./stop_services.sh"