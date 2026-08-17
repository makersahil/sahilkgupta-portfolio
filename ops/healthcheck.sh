#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-${DEPLOYMENT_BASE_URL:-}}"
[[ -n "$BASE" ]] || { echo "Usage: $0 https://example.com" >&2; exit 2; }
curl --fail --silent --show-error --max-time 10 "$BASE/api/live" >/dev/null
curl --fail --silent --show-error --max-time 10 "$BASE/api/ready" >/dev/null
echo "Health check PASS"
