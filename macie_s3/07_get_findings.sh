#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck disable=SC1091
source "${SCRIPT_DIR}/lib/common.sh"

require_aws

FINDING_IDS="$(aws macie2 list-findings --region "${AWS_REGION}" --max-results 50 --query "findingIds" --output text || true)"

if [[ -z "${FINDING_IDS}" ]]; then
  echo "No finding IDs returned yet. Re-run after the job is COMPLETE."
  exit 0
fi

echo "Fetching findings for IDs:"
echo "${FINDING_IDS}"

aws macie2 get-findings --region "${AWS_REGION}" --finding-ids ${FINDING_IDS} --output json
