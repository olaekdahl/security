#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

ACCOUNT_ID="$(account_id)"
BUCKET_FROM_CONFIG="${BUCKET:-}"

if [[ -n "${BUCKET_FROM_CONFIG}" ]]; then
  BUCKET_NAME="${BUCKET_FROM_CONFIG}"
else
  BUCKET_NAME="macie-demo-${ACCOUNT_ID}-$(date +%s)"
fi

echo "Creating bucket: ${BUCKET_NAME} in region: ${AWS_REGION}"

# us-east-1 has special create-bucket behavior (no LocationConstraint)
if [[ "${AWS_REGION}" == "us-east-1" ]]; then
  aws s3api create-bucket --bucket "${BUCKET_NAME}" --region "${AWS_REGION}"
else
  aws s3api create-bucket     --bucket "${BUCKET_NAME}"     --region "${AWS_REGION}"     --create-bucket-configuration LocationConstraint="${AWS_REGION}"
fi

echo "Enabling versioning (optional)"
aws s3api put-bucket-versioning   --bucket "${BUCKET_NAME}"   --versioning-configuration Status=Enabled   --region "${AWS_REGION}"

state_set bucket "${BUCKET_NAME}"

echo "Bucket created and saved to .state/bucket"
