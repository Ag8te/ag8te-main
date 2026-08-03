#!/usr/bin/env bash

set -euo pipefail

REPOSITORY="${GITHUB_REPOSITORY:-AG8TE/ag8te-main}"
WORKFLOW="${MOBILE_RELEASE_WORKFLOW:-mobile-store-release.yml}"
BRANCH="${1:-main}"
RELEASE_NOTES="${2:-Automated mobile testing build after a successful production deployment.}"

if [[ "${BRANCH}" != "main" ]]; then
  echo "Mobile release skipped: only main deployments may trigger store builds."
  exit 0
fi

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  gh workflow run "${WORKFLOW}" \
    --repo "${REPOSITORY}" \
    --ref main \
    -f "release_notes=${RELEASE_NOTES}"
  echo "Mobile store testing workflow started through GitHub CLI."
  exit 0
fi

TOKEN="${GH_TOKEN:-${GITHUB_TOKEN:-}}"
if [[ -z "${TOKEN}" ]]; then
  echo "GitHub authentication is required to start the mobile release workflow." >&2
  echo "Install and authenticate GitHub CLI, or export GH_TOKEN with Actions: write permission." >&2
  exit 1
fi

PAYLOAD="$(
  BRANCH="${BRANCH}" RELEASE_NOTES="${RELEASE_NOTES}" python3 - <<'PY'
import json
import os

print(json.dumps({
    "ref": os.environ["BRANCH"],
    "inputs": {"release_notes": os.environ["RELEASE_NOTES"]},
}))
PY
)"

curl --fail --silent --show-error \
  --request POST \
  --header "Accept: application/vnd.github+json" \
  --header "Authorization: Bearer ${TOKEN}" \
  --header "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${REPOSITORY}/actions/workflows/${WORKFLOW}/dispatches" \
  --data "${PAYLOAD}"

echo "Mobile store testing workflow started through the GitHub API."
