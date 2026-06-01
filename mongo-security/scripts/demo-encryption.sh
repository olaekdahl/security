#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="${BASE_URL:-http://localhost:3001}"

echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       MongoDB Field-Level Encryption Demo                 ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Step 1: Create a user with sensitive data
echo -e "${YELLOW}Step 1: Creating user with sensitive data (SSN, Credit Card, Email)${NC}"
echo -e "${BLUE}Request:${NC}"
echo 'POST /users/encrypted'
echo '{
  "username": "jane_doe",
  "password": "SecurePass123!",
  "email": "jane.doe@example.com",
  "ssn": "123-45-6789",
  "creditCard": "4111-1111-1111-1111"
}'
echo ""

RESPONSE=$(curl -s -X POST "${BASE_URL}/users/encrypted" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane_doe",
    "password": "SecurePass123!",
    "email": "jane.doe@example.com",
    "ssn": "123-45-6789",
    "creditCard": "4111-1111-1111-1111"
  }')

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq .
echo ""

# Step 2: Show what's actually stored in the database
echo -e "${YELLOW}Step 2: Viewing RAW data in MongoDB (encrypted)${NC}"
echo -e "${BLUE}Request:${NC} GET /users/raw/jane_doe"
echo ""

RESPONSE=$(curl -s "${BASE_URL}/users/raw/jane_doe")
echo -e "${GREEN}Response (what MongoDB actually stores):${NC}"
echo "$RESPONSE" | jq .
echo ""
echo -e "${RED}⚠️  Notice: SSN, email, and credit card are ENCRYPTED blobs!${NC}"
echo -e "${RED}   Even with database access, attackers cannot read this data.${NC}"
echo ""

# Step 3: Show decrypted view (with proper key)
echo -e "${YELLOW}Step 3: Viewing DECRYPTED data (application has the key)${NC}"
echo -e "${BLUE}Request:${NC} GET /users/encrypted/jane_doe"
echo ""

RESPONSE=$(curl -s "${BASE_URL}/users/encrypted/jane_doe")
echo -e "${GREEN}Response (decrypted by application):${NC}"
echo "$RESPONSE" | jq .
echo ""

# Step 4: Test encryption round-trip
echo -e "${YELLOW}Step 4: Testing encryption/decryption round-trip${NC}"
echo -e "${BLUE}Request:${NC} POST /encrypt"
echo '{ "value": "My secret data 12345" }'
echo ""

RESPONSE=$(curl -s -X POST "${BASE_URL}/encrypt" \
  -H "Content-Type: application/json" \
  -d '{"value": "My secret data 12345"}')

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq .
echo ""

# Step 5: Test secure login with hashed password
echo -e "${YELLOW}Step 5: Testing secure login (password hashing)${NC}"
echo -e "${BLUE}Correct password:${NC}"

RESPONSE=$(curl -s -X POST "${BASE_URL}/login/secure" \
  -H "Content-Type: application/json" \
  -d '{"username": "jane_doe", "password": "SecurePass123!"}')
echo "$RESPONSE" | jq .
echo ""

echo -e "${BLUE}Wrong password:${NC}"
RESPONSE=$(curl -s -X POST "${BASE_URL}/login/secure" \
  -H "Content-Type: application/json" \
  -d '{"username": "jane_doe", "password": "WrongPassword"}')
echo "$RESPONSE" | jq .
echo ""

# Summary
echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                     Summary                               ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓ Sensitive fields (SSN, email, credit card) are encrypted${NC}"
echo -e "${GREEN}✓ Only the application with the key can decrypt them${NC}"
echo -e "${GREEN}✓ Passwords are hashed (one-way), not encrypted${NC}"
echo -e "${GREEN}✓ Database breach alone doesn't expose sensitive data${NC}"
echo ""
echo -e "${YELLOW}Key Takeaways:${NC}"
echo "  1. Field-level encryption protects data even if DB is compromised"
echo "  2. Encryption keys should be stored in a KMS, not in code"
echo "  3. Passwords should be HASHED, not encrypted (one-way vs two-way)"
echo "  4. Defense in depth: combine encryption with auth, RBAC, and TLS"
echo ""
