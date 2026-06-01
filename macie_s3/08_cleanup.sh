#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

BUCKET_NAME="$(state_get bucket || echo '')"

if [[ -n "${BUCKET_NAME}" ]]; then
  echo "Deleting all object versions in bucket: ${BUCKET_NAME}"
  # Delete all object versions (required for versioned buckets)
  aws s3api list-object-versions --bucket "${BUCKET_NAME}" --region "${AWS_REGION}" --query 'Versions[].{Key:Key,VersionId:VersionId}' --output json 2>/dev/null | \
    jq -c '.[]? // empty' | while read -r obj; do
      key=$(echo "$obj" | jq -r '.Key')
      version_id=$(echo "$obj" | jq -r '.VersionId')
      echo "Deleting version: ${key} (${version_id})"
      aws s3api delete-object --bucket "${BUCKET_NAME}" --key "${key}" --version-id "${version_id}" --region "${AWS_REGION}" || true
    done

  # Delete all delete markers
  echo "Deleting all delete markers in bucket: ${BUCKET_NAME}"
  aws s3api list-object-versions --bucket "${BUCKET_NAME}" --region "${AWS_REGION}" --query 'DeleteMarkers[].{Key:Key,VersionId:VersionId}' --output json 2>/dev/null | \
    jq -c '.[]? // empty' | while read -r obj; do
      key=$(echo "$obj" | jq -r '.Key')
      version_id=$(echo "$obj" | jq -r '.VersionId')
      echo "Deleting delete marker: ${key} (${version_id})"
      aws s3api delete-object --bucket "${BUCKET_NAME}" --key "${key}" --version-id "${version_id}" --region "${AWS_REGION}" || true
    done

  echo "Deleting bucket: ${BUCKET_NAME}"
  aws s3api delete-bucket --bucket "${BUCKET_NAME}" --region "${AWS_REGION}" || true
else
  echo "No bucket found in state, skipping S3 cleanup"
fi

echo "Disabling Amazon Macie..."
aws macie2 disable-macie --region "${AWS_REGION}" || true

echo "Cleanup local files"
rm -rf "${SCRIPT_DIR}/macie-demo-data" || true
rm -rf "${SCRIPT_DIR}/.state" || true

echo "Cleanup complete."
