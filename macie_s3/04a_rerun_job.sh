#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

BUCKET_NAME="$(state_get bucket)"
ACCOUNT_ID="$(account_id)"
JOB_NAME="macie-s3-demo-job-$(date +%s)"

echo "Creating new Macie classification job (rerun): ${JOB_NAME}"
echo "Scanning bucket: ${BUCKET_NAME}, prefix: ${S3_PREFIX}"

JOB_ID="$(aws macie2 create-classification-job \
  --region "${AWS_REGION}" \
  --job-type ONE_TIME \
  --name "${JOB_NAME}" \
  --sampling-percentage "${SAMPLING_PERCENTAGE}" \
  --description "Macie demo job (rerun) scanning ${S3_PREFIX} prefix in ${BUCKET_NAME}" \
  --s3-job-definition "{
    \"bucketDefinitions\": [{\"accountId\": \"${ACCOUNT_ID}\", \"buckets\": [\"${BUCKET_NAME}\"]}],
    \"scoping\": {
      \"includes\": {
        \"and\": [
          {\"simpleScopeTerm\": {\"key\": \"OBJECT_KEY\", \"values\": [\"${S3_PREFIX}\"], \"comparator\": \"STARTS_WITH\"}}
        ]
      }
    }
  }" \
  --query jobId --output text
)"

# Update state with new job ID
state_set job_id "${JOB_ID}"
state_set job_name "${JOB_NAME}"

echo "New JOB_ID=${JOB_ID}"
echo "Updated .state/job_id"
echo ""
echo "Run ./05_check_job.sh to monitor job status"
