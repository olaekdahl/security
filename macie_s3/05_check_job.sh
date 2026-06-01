#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

JOB_ID="$(state_get job_id)"

echo "Describing job: ${JOB_ID}"
aws macie2 describe-classification-job --region "${AWS_REGION}" --job-id "${JOB_ID}"   --query "{jobId:jobId, name:name, status:jobStatus, createdAt:createdAt, completedAt:jobEndTime, lastRunErrorStatus:lastRunErrorStatus}"   --output json
