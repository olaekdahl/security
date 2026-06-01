#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

echo "AWS_REGION=${AWS_REGION}"
echo "Caller identity:"
aws sts get-caller-identity --region "${AWS_REGION}"

echo
echo "If you see your account info above, prerequisites look good."
