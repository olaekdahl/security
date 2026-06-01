#!/usr/bin/env bash
set -euo pipefail

# Load config if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [[ -f "${SCRIPT_DIR}/config.env" ]]; then
  # shellcheck disable=SC1091
  source "${SCRIPT_DIR}/config.env"
fi

AWS_REGION="${AWS_REGION:-us-east-1}"
S3_PREFIX="${S3_PREFIX:-demo/}"
SAMPLING_PERCENTAGE="${SAMPLING_PERCENTAGE:-100}"

STATE_DIR="${SCRIPT_DIR}/.state"
mkdir -p "${STATE_DIR}"

state_set() {
  local key="$1"
  local value="$2"
  printf "%s" "${value}" > "${STATE_DIR}/${key}"
}

state_get() {
  local key="$1"
  if [[ -f "${STATE_DIR}/${key}" ]]; then
    cat "${STATE_DIR}/${key}"
  else
    return 1
  fi
}

require_cmd() {
  local cmd="$1"
  if ! command -v "${cmd}" >/dev/null 2>&1; then
    echo "Missing required command: ${cmd}" >&2
    exit 1
  fi
}

require_aws() {
  require_cmd aws
  aws --version >/dev/null 2>&1 || true
}

account_id() {
  aws sts get-caller-identity --region "${AWS_REGION}" --query Account --output text
}
