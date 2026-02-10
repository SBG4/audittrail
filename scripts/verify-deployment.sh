#!/bin/bash
set -euo pipefail

#############################################
# AuditTrail Deployment Verification
#
# Run after deployment to verify all services
# are running correctly.
#
# Usage: ./verify.sh
#############################################

echo "========================================="
echo "  AuditTrail Deployment Verification"
echo "========================================="
echo ""

PASS=0
FAIL=0
BASE_URL="${BASE_URL:-http://localhost}"

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

# --- Check 1: Docker services running ---
echo "[1/5] Checking Docker services..."
SERVICES=$(docker compose ps --format '{{.Service}} {{.State}}' 2>/dev/null || echo "")

for svc in db api nginx; do
  if echo "$SERVICES" | grep -q "^${svc} .*running"; then
    pass "${svc} is running"
  else
    fail "${svc} is not running"
  fi
done

# --- Check 2: API health ---
echo ""
echo "[2/5] Checking API health..."
HEALTH=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/health" 2>/dev/null || echo -e "\n000")
HEALTH_CODE=$(echo "$HEALTH" | tail -1)
HEALTH_BODY=$(echo "$HEALTH" | head -1)

if [ "$HEALTH_CODE" = "200" ] && echo "$HEALTH_BODY" | grep -q '"status":"ok"'; then
  pass "API health endpoint returns OK"
else
  fail "API health check failed (HTTP ${HEALTH_CODE})"
fi

# --- Check 3: Authentication ---
echo ""
echo "[3/5] Checking authentication..."
LOGIN=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=changeme" 2>/dev/null || echo -e "\n000")
LOGIN_CODE=$(echo "$LOGIN" | tail -1)
LOGIN_BODY=$(echo "$LOGIN" | head -1)

if [ "$LOGIN_CODE" = "200" ] && echo "$LOGIN_BODY" | grep -q '"access_token"'; then
  pass "Login with default credentials works"

  # Extract token for further tests
  TOKEN=$(echo "$LOGIN_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])" 2>/dev/null || echo "")

  if [ -n "$TOKEN" ]; then
    ME=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/api/auth/me" 2>/dev/null || echo -e "\n000")
    ME_CODE=$(echo "$ME" | tail -1)
    if [ "$ME_CODE" = "200" ]; then
      pass "Authenticated API access works"
    else
      fail "Authenticated API access failed (HTTP ${ME_CODE})"
    fi
  fi
else
  fail "Login failed (HTTP ${LOGIN_CODE})"
fi

# --- Check 4: Frontend serving ---
echo ""
echo "[4/5] Checking frontend..."
FRONTEND=$(curl -s -w "\n%{http_code}" "${BASE_URL}/" 2>/dev/null || echo -e "\n000")
FRONTEND_CODE=$(echo "$FRONTEND" | tail -1)

if [ "$FRONTEND_CODE" = "200" ]; then
  pass "Frontend is served at /"
else
  fail "Frontend not serving (HTTP ${FRONTEND_CODE})"
fi

# SPA fallback
SPA=$(curl -s -w "\n%{http_code}" "${BASE_URL}/login" 2>/dev/null || echo -e "\n000")
SPA_CODE=$(echo "$SPA" | tail -1)

if [ "$SPA_CODE" = "200" ]; then
  pass "SPA fallback routing works (/login)"
else
  fail "SPA fallback failed (HTTP ${SPA_CODE})"
fi

# --- Check 5: Data persistence hint ---
echo ""
echo "[5/5] Checking data volume..."
VOLUME=$(docker volume ls --filter "name=postgres_data" --format '{{.Name}}' 2>/dev/null || echo "")

if [ -n "$VOLUME" ]; then
  pass "PostgreSQL data volume exists"
else
  fail "PostgreSQL data volume not found"
fi

# --- Summary ---
echo ""
echo "========================================="
echo "  Verification Results"
echo "========================================="
echo ""
echo "  Passed: ${PASS}"
echo "  Failed: ${FAIL}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "  ALL CHECKS PASSED"
  echo ""
  echo "  Application is ready for use."
  echo "  Open ${BASE_URL} in a browser."
  exit 0
else
  echo "  SOME CHECKS FAILED"
  echo ""
  echo "  Review the output above."
  echo "  Check logs: docker compose logs -f"
  exit 1
fi
