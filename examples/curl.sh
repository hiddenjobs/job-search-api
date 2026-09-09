#!/usr/bin/env bash

set -euo pipefail

api_base_url="${JOB_SEARCH_API_BASE_URL:-https://api.hiddenjobs.dev/v1}"
api_key="${JOB_SEARCH_API_KEY:-}"

if [[ -z "$api_key" ]]; then
  printf '%s\n' 'Set JOB_SEARCH_API_KEY before running this example.' >&2
  exit 1
fi

curl --fail-with-body --silent --show-error --get "${api_base_url}/jobs" \
  --data-urlencode 'q=typescript' \
  --data-urlencode 'remoteLocation=Europe' \
  --data-urlencode 'limit=5' \
  --header "Authorization: Bearer ${api_key}"
