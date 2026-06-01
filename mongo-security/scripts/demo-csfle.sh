#!/usr/bin/env bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

BASE_URL="${BASE_URL:-http://localhost:3001}"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   MongoDB Client-Side Field Level Encryption (CSFLE) Demo        ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}CSFLE provides AUTOMATIC encryption - no manual encrypt/decrypt calls!${NC}"
echo -e "${CYAN}Fields are encrypted/decrypted transparently by the MongoDB driver.${NC}"
echo ""

# Step 1: Create a user with sensitive data
echo -e "${YELLOW}Step 1: Creating user with sensitive data${NC}"
echo -e "${BLUE}The MongoDB driver will AUTOMATICALLY encrypt ssn, creditCard, and email${NC}"
echo ""

RESPONSE=$(curl -s -X POST "${BASE_URL}/users/csfle" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "csfle_user",
    "password": "SecurePass123!",
    "email": "csfle@example.com",
    "ssn": "999-88-7777",
    "creditCard": "5500-0000-0000-0004",
    "medicalRecords": ["allergies: none", "blood type: O+"]
  }')

echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq .
echo ""

# Step 2: Show what's actually stored (encrypted Binary blobs)
echo -e "${YELLOW}Step 2: Viewing RAW data in MongoDB (encrypted Binary)${NC}"
echo -e "${BLUE}Using a non-encrypted client to see what's actually stored:${NC}"
echo ""

RESPONSE=$(curl -s "${BASE_URL}/users/csfle/raw/csfle_user")
echo -e "${GREEN}Response (what MongoDB actually stores):${NC}"
echo "$RESPONSE" | jq .
echo ""
echo -e "${RED}⚠️  Notice: Sensitive fields are Binary blobs (BSON encrypted data)!${NC}"
echo -e "${RED}   This is MongoDB's native encryption format.${NC}"
echo ""

# Step 3: Show decrypted view (automatic via CSFLE client)
echo -e "${YELLOW}Step 3: Viewing data through CSFLE client (auto-decrypted)${NC}"
echo -e "${BLUE}The encrypted client automatically decrypts when reading:${NC}"
echo ""

RESPONSE=$(curl -s "${BASE_URL}/users/csfle/csfle_user")
echo -e "${GREEN}Response (automatically decrypted):${NC}"
echo "$RESPONSE" | jq .
echo ""

# Step 4: Query by encrypted field!
echo -e "${YELLOW}Step 4: Querying by encrypted SSN field${NC}"
echo -e "${BLUE}With Deterministic encryption, you can query encrypted fields!${NC}"
echo ""

echo -e "${CYAN}Searching for SSN: 999-88-7777${NC}"
RESPONSE=$(curl -s "${BASE_URL}/users/csfle/by-ssn/999-88-7777")
echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq .
echo ""

echo -e "${CYAN}Searching for wrong SSN: 111-22-3333${NC}"
RESPONSE=$(curl -s "${BASE_URL}/users/csfle/by-ssn/111-22-3333")
echo -e "${GREEN}Response:${NC}"
echo "$RESPONSE" | jq .
echo ""

# Step 5: Compare methods
echo -e "${YELLOW}Step 5: Comparing encryption methods${NC}"
RESPONSE=$(curl -s "${BASE_URL}/demo/compare-methods")
echo "$RESPONSE" | jq .
echo ""

# Summary
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    CSFLE Summary                                 ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}How CSFLE Works:${NC}"
echo ""
echo "  ┌─────────────┐    Schema defines     ┌─────────────┐"
echo "  │ Application │───encrypted fields───>│   MongoDB   │"
echo "  │   (Node.js) │                       │   Driver    │"
echo "  └─────────────┘                       └──────┬──────┘"
echo "                                                │"
echo "                                         auto-encrypt"
echo "                                                │"
echo "                                         ┌──────▼──────┐"
echo "                                         │   MongoDB   │"
echo "                                         │   Server    │"
echo "                                         │ (sees only  │"
echo "                                         │  encrypted) │"
echo "                                         └─────────────┘"
echo ""
echo -e "${GREEN}✓ Automatic encryption - no manual calls needed${NC}"
echo -e "${GREEN}✓ Schema-based - define once, encrypted everywhere${NC}"
echo -e "${GREEN}✓ Queryable (Deterministic) - can search encrypted fields${NC}"
echo -e "${GREEN}✓ MongoDB native - battle-tested, enterprise-grade${NC}"
echo ""
echo -e "${YELLOW}Encryption Algorithms:${NC}"
echo "  • Deterministic: Same input = same ciphertext (allows queries)"
echo "  • Random: Same input = different ciphertext each time (more secure)"
echo ""
echo -e "${YELLOW}Production Requirements:${NC}"
echo "  • Use a real KMS (AWS KMS, Azure Key Vault, GCP KMS)"
echo "  • Never store master keys in code or env vars"
echo "  • Rotate data encryption keys periodically"
echo ""
