#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

BUCKET_NAME="$(state_get bucket)"

echo "Deleting S3 objects in bucket: ${BUCKET_NAME}"
aws s3 rm "s3://${BUCKET_NAME}" --recursive --region "${AWS_REGION}" || true

echo "Deleting bucket: ${BUCKET_NAME}"
aws s3api delete-bucket --bucket "${BUCKET_NAME}" --region "${AWS_REGION}" || true

echo "Disabling Amazon Macie..."
aws macie2 disable-macie --region "${AWS_REGION}" || true

echo "Cleanup local files"
rm -rf "${SCRIPT_DIR}/macie-demo-data" || true
rm -rf "${SCRIPT_DIR}/.state" || true

echo "Cleanup complete."
