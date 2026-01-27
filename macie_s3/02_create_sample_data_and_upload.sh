#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

BUCKET_NAME="$(state_get bucket)"
DATA_DIR="${SCRIPT_DIR}/macie-demo-data"
mkdir -p "${DATA_DIR}"

cat > "${DATA_DIR}/public.txt" <<'EOF'
This is a public document. No sensitive content here.
EOF

cat > "${DATA_DIR}/internal_notes.txt" <<'EOF'
Internal notes:
Project: Roadrunner
Contact: jane.doe@example.com
EOF

cat > "${DATA_DIR}/pii_sample.txt" <<'EOF'
Customer record
Name: John Smith
Email: john.smith@example.com
Phone: (415) 555-1234
SSN: 123-45-6789
Credit Card: 4111 1111 1111 1111
EOF

echo "Uploading sample files to s3://${BUCKET_NAME}/${S3_PREFIX}"
aws s3 cp "${DATA_DIR}/" "s3://${BUCKET_NAME}/${S3_PREFIX}" --recursive --region "${AWS_REGION}"

echo "Upload complete."
