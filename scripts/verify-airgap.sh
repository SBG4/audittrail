#!/bin/bash
set -e
echo "=== Airgap Verification ==="
echo "Testing API container without network..."
docker run --rm --network none $(docker compose images api -q) python -c "from src.main import app; print('FastAPI app imports successfully without network')"
echo "Testing Nginx container without network..."
docker run --rm --network none $(docker compose images nginx -q) nginx -t
echo "=== All airgap checks passed ==="
