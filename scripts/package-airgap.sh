#!/bin/bash
set -euo pipefail

#############################################
# AuditTrail Airgap Packaging Script
#
# Run on a build machine WITH internet access.
# Produces a self-contained tarball for USB transfer
# to an airgapped network.
#
# Usage: bash scripts/package-airgap.sh [version]
# Example: bash scripts/package-airgap.sh 1.0.0
#############################################

echo "========================================="
echo "  AuditTrail Airgap Packaging"
echo "========================================="
echo ""

# Version tag (default: timestamp)
VERSION="${1:-$(date +%Y%m%d-%H%M%S)}"
OUTDIR="audittrail-airgap-${VERSION}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "Version:     ${VERSION}"
echo "Output dir:  ${OUTDIR}"
echo "Project dir: ${PROJECT_DIR}"
echo ""

# Detect checksum command (cross-platform: Linux vs macOS)
if command -v sha256sum &>/dev/null; then
  SHA_CMD="sha256sum"
elif command -v shasum &>/dev/null; then
  SHA_CMD="shasum -a 256"
else
  echo "ERROR: Neither sha256sum nor shasum found. Cannot generate checksums."
  exit 1
fi

# Check prerequisites
if ! command -v docker &>/dev/null; then
  echo "ERROR: docker is not installed or not in PATH."
  exit 1
fi

if ! docker compose version &>/dev/null; then
  echo "ERROR: docker compose is not available."
  exit 1
fi

# Create output directory
mkdir -p "${OUTDIR}"

# Step 1: Build Docker images
echo "[1/5] Building Docker images..."
cd "${PROJECT_DIR}"
docker compose build --no-cache
echo "      Build complete."
echo ""

# Step 2: Export Docker images as compressed tarball
echo "[2/5] Exporting Docker images (this may take a few minutes)..."
IMAGES=$(docker compose config --images)
echo "      Images: ${IMAGES}"
docker save ${IMAGES} | gzip > "${PROJECT_DIR}/${OUTDIR}/images.tar.gz"
IMAGE_SIZE=$(du -h "${PROJECT_DIR}/${OUTDIR}/images.tar.gz" | cut -f1)
echo "      Image archive: ${IMAGE_SIZE}"
echo ""

# Step 3: Copy deployment files
echo "[3/5] Copying deployment files..."
cp "${PROJECT_DIR}/docker-compose.yml" "${PROJECT_DIR}/${OUTDIR}/docker-compose.yml"

# Create .env from example or default
if [ -f "${PROJECT_DIR}/.env.example" ]; then
  cp "${PROJECT_DIR}/.env.example" "${PROJECT_DIR}/${OUTDIR}/.env"
else
  cat > "${PROJECT_DIR}/${OUTDIR}/.env" << 'ENVEOF'
# AuditTrail Environment Configuration
DB_USER=audittrail
DB_PASSWORD=audittrail
SECRET_KEY=change-me-in-production
APP_PORT=80
ENVEOF
fi

# Copy scripts
cp "${PROJECT_DIR}/scripts/load-airgap.sh" "${PROJECT_DIR}/${OUTDIR}/load.sh"
cp "${PROJECT_DIR}/scripts/verify-deployment.sh" "${PROJECT_DIR}/${OUTDIR}/verify.sh"
chmod +x "${PROJECT_DIR}/${OUTDIR}/load.sh" "${PROJECT_DIR}/${OUTDIR}/verify.sh"
echo "      Copied docker-compose.yml, .env, load.sh, verify.sh"
echo ""

# Step 4: Generate checksums
echo "[4/5] Generating SHA256 checksums..."
cd "${PROJECT_DIR}/${OUTDIR}"
${SHA_CMD} images.tar.gz docker-compose.yml .env > SHA256SUMS
echo "      Checksums written to SHA256SUMS"
echo ""

# Step 5: Create final package tarball
echo "[5/5] Creating final package..."
cd "${PROJECT_DIR}"
tar czf "${OUTDIR}.tar.gz" "${OUTDIR}/"
PACKAGE_SIZE=$(du -h "${OUTDIR}.tar.gz" | cut -f1)
echo "      Package: ${OUTDIR}.tar.gz (${PACKAGE_SIZE})"
echo ""

# Cleanup intermediate directory (keep only the tarball)
rm -rf "${OUTDIR}"

echo "========================================="
echo "  Packaging Complete!"
echo "========================================="
echo ""
echo "Package: ${OUTDIR}.tar.gz (${PACKAGE_SIZE})"
echo ""
echo "Transfer this file to the airgapped network via USB."
echo "On the target machine:"
echo ""
echo "  tar xzf ${OUTDIR}.tar.gz"
echo "  cd ${OUTDIR}"
echo "  ./load.sh"
echo ""
echo "========================================="
