#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

echo "Enabling Macie in region: ${AWS_REGION}"
aws macie2 enable-macie --region "${AWS_REGION}" || true

echo "Macie session:"
aws macie2 get-macie-session --region "${AWS_REGION}"
