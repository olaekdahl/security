#!/bin/bash
# Demo script for Threat Modeling application

set -e

echo "═══════════════════════════════════════════════════════════════"
echo "  THREAT MODELING DEMO"
echo "  STRIDE | PASTA | DREAD"
echo "═══════════════════════════════════════════════════════════════"
echo ""

BASE_URL="http://localhost:3001/api"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check if server is running
print_section "1. Health Check"
echo "Checking if API server is running..."
HEALTH=$(curl -s "$BASE_URL/health" 2>/dev/null || echo "error")
if echo "$HEALTH" | grep -q "healthy"; then
    echo -e "${GREEN}✓ Server is healthy${NC}"
    echo "$HEALTH" | jq .
else
    echo -e "${RED}✗ Server is not running. Start it with: docker compose up -d${NC}"
    exit 1
fi

# STRIDE Demo
print_section "2. STRIDE Analysis"
echo "Running STRIDE analysis on a login endpoint..."
echo ""
curl -s "$BASE_URL/demo/stride/example" | jq '{
  asset: .asset.name,
  assetType: .asset.type,
  threatsFound: .analysis.summary.totalThreats,
  categories: .analysis.summary.byCategory,
  applicableThreats: [.analysis.threats[] | select(.applicable) | {
    category: .categoryName,
    severity: .severity,
    threats: .specificThreats[0:2]
  }]
}'
echo ""
echo -e "${YELLOW}STRIDE identifies threats in 6 categories:${NC}"
echo "  S - Spoofing (impersonation)"
echo "  T - Tampering (data modification)"
echo "  R - Repudiation (deniability)"
echo "  I - Information Disclosure (data leaks)"
echo "  D - Denial of Service (availability)"
echo "  E - Elevation of Privilege (unauthorized access)"

# DREAD Demo
print_section "3. DREAD Scoring"
echo "Calculating DREAD score for a NoSQL Injection vulnerability..."
echo ""
DREAD_RESULT=$(curl -s -X POST "$BASE_URL/demo/interactive/dread" \
  -H "Content-Type: application/json" \
  -d '{
    "threatName": "NoSQL Injection",
    "ratings": {
      "damage": 4,
      "reproducibility": 3,
      "exploitability": 2,
      "affectedUsers": 4,
      "discoverability": 3
    }
  }')

echo "$DREAD_RESULT" | jq '{
  threat: .threatName,
  ratings: .ratings,
  score: .score.total,
  riskLevel: .score.riskLevel.level,
  action: .score.riskLevel.action,
  timeline: .interpretation.timeline
}'
echo ""
SCORE=$(echo "$DREAD_RESULT" | jq -r '.score.total')
LEVEL=$(echo "$DREAD_RESULT" | jq -r '.score.riskLevel.level')

if [ "$LEVEL" = "CRITICAL" ]; then
    echo -e "${RED}⚠️  CRITICAL RISK (Score: $SCORE/10)${NC}"
    echo -e "${RED}   Immediate remediation required!${NC}"
elif [ "$LEVEL" = "HIGH" ]; then
    echo -e "${YELLOW}⚠️  HIGH RISK (Score: $SCORE/10)${NC}"
    echo -e "${YELLOW}   Fix before next release!${NC}"
else
    echo -e "${GREEN}✓  Risk Level: $LEVEL (Score: $SCORE/10)${NC}"
fi

# PASTA Demo
print_section "4. PASTA Analysis (7 Stages)"
echo "Running PASTA risk-centric analysis..."
echo ""
curl -s "$BASE_URL/demo/pasta/example" | jq '{
  application: .application.name,
  stagesCompleted: .analysis.summary.completedStages,
  totalRisks: .analysis.summary.totalRisks,
  highPriorityRisks: .analysis.summary.highPriorityRisks,
  stages: [.analysis.stages[] | {
    stage: .number,
    name: .name,
    status: .status
  }]
}'
echo ""
echo -e "${YELLOW}PASTA provides comprehensive threat analysis:${NC}"
echo "  1. Define Business Objectives"
echo "  2. Define Technical Scope"
echo "  3. Decompose Application"
echo "  4. Threat Analysis"
echo "  5. Vulnerability Analysis"
echo "  6. Attack Simulation"
echo "  7. Risk & Impact Analysis"

# Full Example
print_section "5. Complete Threat Modeling Example"
echo "Running comprehensive analysis using all frameworks..."
echo ""
curl -s "$BASE_URL/demo/full-example" | jq '{
  system: .system.name,
  assetsAnalyzed: .summary.totalAssetsAnalyzed,
  threatsIdentified: .summary.totalThreatsIdentified,
  criticalThreats: .summary.criticalThreats,
  highThreats: .summary.highThreats,
  topRisk: .summary.topRisk,
  topRiskScore: .summary.topRiskScore,
  remediationPlan: .step4_remediation.plan | map({
    priority: .priority,
    threat: .threat,
    score: .score,
    timeline: .timeline
  })
}'

# Interactive STRIDE
print_section "6. Interactive: Analyze Your Own Asset"
echo "Analyzing a custom database asset..."
echo ""
curl -s -X POST "$BASE_URL/demo/interactive/stride" \
  -H "Content-Type: application/json" \
  -d '{
    "asset": {
      "name": "Customer Database",
      "type": "database",
      "isPublicFacing": false,
      "handlesUserInput": true,
      "containsSensitiveData": true,
      "hasAuditLog": true
    }
  }' | jq '{
  asset: .asset.name,
  threatsFound: .analysis.summary.totalThreats,
  criticalThreats: [.analysis.threats[] | select(.applicable and .severity == "CRITICAL") | .categoryName]
}'

# Summary
print_section "Demo Complete!"
echo ""
echo "You've seen:"
echo "  ✓ STRIDE threat identification (6 categories)"
echo "  ✓ DREAD risk scoring (0-10 scale)"
echo "  ✓ PASTA comprehensive analysis (7 stages)"
echo "  ✓ Complete threat modeling workflow"
echo ""
echo "Next steps:"
echo "  1. Open the React app: http://localhost:3000"
echo "  2. Register an account to create threats and assets"
echo "  3. Run your own analyses"
echo ""
echo "API Documentation: $BASE_URL/demo/quick-start"
echo ""
