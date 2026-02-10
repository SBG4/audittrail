#!/bin/bash
set -euo pipefail

#############################################
# AuditTrail Airgap Load Script
#
# Run on the TARGET airgapped machine.
# Loads Docker images and starts the application.
#
# Prerequisites: Docker and Docker Compose installed
# Usage: ./load.sh
#############################################

echo "========================================="
echo "  AuditTrail Airgap Deployment"
echo "========================================="
echo ""

# Check prerequisites
echo "[1/5] Checking prerequisites..."

if ! command -v docker &>/dev/null; then
  echo "ERROR: Docker is not installed."
  echo "Install Docker before running this script."
  exit 1
fi

if ! docker compose version &>/dev/null; then
  echo "ERROR: Docker Compose is not available."
  echo "Install Docker Compose before running this script."
  exit 1
fi

if ! docker info &>/dev/null 2>&1; then
  echo "ERROR: Cannot connect to Docker daemon."
  echo "Ensure Docker is running: sudo systemctl start docker"
  exit 1
fi

if [ ! -f "images.tar.gz" ]; then
  echo "ERROR: images.tar.gz not found in current directory."
  echo "Run this script from the extracted package directory."
  exit 1
fi

echo "      Docker:         $(docker --version)"
echo "      Docker Compose: $(docker compose version --short)"
echo ""

# Step 2: Verify checksums (if available)
echo "[2/5] Verifying file integrity..."

# Detect checksum command
if command -v sha256sum &>/dev/null; then
  SHA_CMD="sha256sum"
elif command -v shasum &>/dev/null; then
  SHA_CMD="shasum -a 256"
else
  SHA_CMD=""
fi

if [ -f "SHA256SUMS" ] && [ -n "${SHA_CMD}" ]; then
  if ${SHA_CMD} --check SHA256SUMS; then
    echo "      All checksums verified."
  else
    echo ""
    echo "WARNING: Checksum verification failed!"
    echo "Files may be corrupted. Re-copy from USB drive."
    echo ""
    read -p "Continue anyway? (y/N): " CONTINUE
    if [ "${CONTINUE}" != "y" ] && [ "${CONTINUE}" != "Y" ]; then
      echo "Aborted."
      exit 1
    fi
  fi
else
  echo "      Checksum file not found or no checksum tool available. Skipping."
fi
echo ""

# Step 3: Load Docker images
echo "[3/5] Loading Docker images (this may take a few minutes)..."
gunzip -c images.tar.gz | docker load
echo "      Images loaded successfully."
echo ""

# Step 4: Start the application
echo "[4/5] Starting application..."

# Stop any existing deployment
docker compose down 2>/dev/null || true

# Start services
docker compose up -d

echo "      Services started."
echo ""

# Step 5: Wait for application to be ready
echo "[5/5] Waiting for application to be ready..."

MAX_WAIT=60
ELAPSED=0
READY=false

while [ $ELAPSED -lt $MAX_WAIT ]; do
  if curl -sf http://localhost/api/health &>/dev/null; then
    READY=true
    break
  fi
  printf "."
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done
echo ""

if [ "$READY" = true ]; then
  echo ""
  echo "========================================="
  echo "  Application is running!"
  echo "========================================="
  echo ""
  echo "  URL: http://localhost"
  echo ""
  echo "  Default credentials:"
  echo "    Username: admin"
  echo "    Password: changeme"
  echo ""
  echo "  IMPORTANT: Change the default password"
  echo "  after first login."
  echo ""
  echo "  To stop:    docker compose down"
  echo "  To restart: docker compose up -d"
  echo "  To logs:    docker compose logs -f"
  echo "  To verify:  ./verify.sh"
  echo ""
  echo "========================================="
else
  echo ""
  echo "WARNING: Application may still be starting."
  echo "Check status with: docker compose ps"
  echo "Check logs with:   docker compose logs -f"
  echo ""
  echo "If the database is initializing for the first time,"
  echo "it may take up to 30 additional seconds."
fi
