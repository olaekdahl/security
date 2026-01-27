#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

echo "Listing recent Macie finding IDs (max 50)"
aws macie2 list-findings --region "${AWS_REGION}" --max-results 50 --output json
