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

cat > "${DATA_DIR}/aws_credentials.txt" <<'EOF'
# Leaked AWS credentials (demo only - these are example keys)
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[production]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
EOF

echo "Uploading sample files to s3://${BUCKET_NAME}/${S3_PREFIX}"
aws s3 sync "${DATA_DIR}/" "s3://${BUCKET_NAME}/${S3_PREFIX}" --region "${AWS_REGION}"

echo "Upload complete."
