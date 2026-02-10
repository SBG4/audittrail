#!/bin/bash
set -e

# Integration verification script for Phase 1: Auth Flow
# Run this after `docker compose up -d` when Docker is available.

PASS=0
FAIL=0
BASE_URL="http://localhost"

pass() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "=== Phase 1 Integration Verification ==="
echo ""

# --- Step 1: Check all services are running ---
echo "[1/7] Checking Docker Compose services..."
SERVICES=$(docker compose ps --format '{{.Service}} {{.State}}' 2>/dev/null)
for svc in db api nginx; do
  if echo "$SERVICES" | grep -q "^${svc} .*running"; then
    pass "$svc is running"
  else
    fail "$svc is not running"
  fi
done

# --- Step 2: Health check ---
echo ""
echo "[2/7] Checking API health endpoint..."
HEALTH=$(curl -s -w "\n%{http_code}" "${BASE_URL}/api/health" 2>/dev/null)
HEALTH_CODE=$(echo "$HEALTH" | tail -1)
HEALTH_BODY=$(echo "$HEALTH" | head -1)
if [ "$HEALTH_CODE" = "200" ] && echo "$HEALTH_BODY" | grep -q '"status":"ok"'; then
  pass "GET /api/health -> 200 {\"status\":\"ok\"}"
else
  fail "GET /api/health -> expected 200 + {\"status\":\"ok\"}, got ${HEALTH_CODE}: ${HEALTH_BODY}"
fi

# --- Step 3: Login with correct credentials ---
echo ""
echo "[3/7] Testing login with correct credentials..."
LOGIN=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=changeme" 2>/dev/null)
LOGIN_CODE=$(echo "$LOGIN" | tail -1)
LOGIN_BODY=$(echo "$LOGIN" | head -1)
if [ "$LOGIN_CODE" = "200" ] && echo "$LOGIN_BODY" | grep -q '"access_token"'; then
  pass "POST /api/auth/login -> 200 + access_token"
  TOKEN=$(echo "$LOGIN_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
else
  fail "POST /api/auth/login -> expected 200 + access_token, got ${LOGIN_CODE}: ${LOGIN_BODY}"
  TOKEN=""
fi

# --- Step 4: Login with wrong credentials ---
echo ""
echo "[4/7] Testing login with wrong credentials..."
BAD_LOGIN=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=wrong" 2>/dev/null)
BAD_LOGIN_CODE=$(echo "$BAD_LOGIN" | tail -1)
if [ "$BAD_LOGIN_CODE" = "401" ]; then
  pass "POST /api/auth/login (wrong password) -> 401"
else
  fail "POST /api/auth/login (wrong password) -> expected 401, got ${BAD_LOGIN_CODE}"
fi

# --- Step 5: Get current user with valid token ---
echo ""
echo "[5/7] Testing /auth/me with valid token..."
if [ -n "$TOKEN" ]; then
  ME=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer ${TOKEN}" "${BASE_URL}/api/auth/me" 2>/dev/null)
  ME_CODE=$(echo "$ME" | tail -1)
  ME_BODY=$(echo "$ME" | head -1)
  if [ "$ME_CODE" = "200" ] && echo "$ME_BODY" | grep -q '"username":"admin"'; then
    pass "GET /api/auth/me -> 200 + admin user"
  else
    fail "GET /api/auth/me -> expected 200 + admin user, got ${ME_CODE}: ${ME_BODY}"
  fi
else
  fail "GET /api/auth/me -> skipped (no token from login)"
fi

# --- Step 6: Data persistence ---
echo ""
echo "[6/7] Testing data persistence across restart..."
echo "  Stopping stack..."
docker compose down 2>/dev/null
echo "  Starting stack..."
docker compose up -d 2>/dev/null
echo "  Waiting for services to be healthy..."
sleep 10

PERSIST_LOGIN=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=changeme" 2>/dev/null)
PERSIST_CODE=$(echo "$PERSIST_LOGIN" | tail -1)
if [ "$PERSIST_CODE" = "200" ]; then
  pass "Login works after restart (data persisted)"
else
  fail "Login failed after restart -> expected 200, got ${PERSIST_CODE}"
fi

# --- Step 7: Frontend serves ---
echo ""
echo "[7/7] Testing frontend SPA serving..."
FRONTEND=$(curl -s -w "\n%{http_code}" "${BASE_URL}/" 2>/dev/null)
FRONTEND_CODE=$(echo "$FRONTEND" | tail -1)
FRONTEND_BODY=$(echo "$FRONTEND" | head -1)
if [ "$FRONTEND_CODE" = "200" ]; then
  pass "GET / -> 200 (SPA served)"
else
  fail "GET / -> expected 200, got ${FRONTEND_CODE}"
fi

# Check SPA fallback
SPA_FALLBACK=$(curl -s -w "\n%{http_code}" "${BASE_URL}/login" 2>/dev/null)
SPA_CODE=$(echo "$SPA_FALLBACK" | tail -1)
if [ "$SPA_CODE" = "200" ]; then
  pass "GET /login -> 200 (SPA fallback working)"
else
  fail "GET /login -> expected 200, got ${SPA_CODE}"
fi

# --- Summary ---
echo ""
echo "=== Results ==="
echo "  Passed: ${PASS}"
echo "  Failed: ${FAIL}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo "ALL INTEGRATION TESTS PASSED"
  exit 0
else
  echo "SOME TESTS FAILED - review output above"
  exit 1
fi
