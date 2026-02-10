#!/bin/sh
set -e
echo "Running database migrations..."
alembic upgrade head
echo "Seeding default data..."
python -m src.scripts.seed || echo "Seed script not found, skipping"
echo "Starting application..."
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --proxy-headers
