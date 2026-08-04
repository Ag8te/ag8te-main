#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ANDROID_DIR="${FRONTEND_DIR}/android"
VERSION_FILE="${FRONTEND_DIR}/../mobile-version.json"
TASK="${1:-bundleRelease}"
STORE_CHANNEL="${STORE_CHANNEL:-google-play}"
STRICT_SIGNING="${STRICT_SIGNING:-1}"
KEYSTORE_PROPERTIES="${ANDROID_DIR}/keystore.properties"
STORE_OUTPUT_DIR="${FRONTEND_DIR}/store-builds/${STORE_CHANNEL}"

read_version_field() {
  python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))[sys.argv[2]])' "${VERSION_FILE}" "$1"
}

APP_VERSION_NAME="${APP_VERSION_NAME:-$(read_version_field version)}"

# Unless explicitly supplied (for reproducible CI releases), select one more
# than both the tracked floor and every artifact already built for this store.
if [[ -z "${APP_VERSION_CODE:-}" ]]; then
  MAX_VERSION_CODE="$(read_version_field build_base)"
  if [[ -d "${STORE_OUTPUT_DIR}" ]]; then
    while IFS= read -r ARTIFACT; do
      FILE_NAME="$(basename "${ARTIFACT}")"
      if [[ "${FILE_NAME}" =~ -([0-9]+)\.(aab|apk)$ ]] && (( BASH_REMATCH[1] > MAX_VERSION_CODE )); then
        MAX_VERSION_CODE="${BASH_REMATCH[1]}"
      fi
    done < <(find "${STORE_OUTPUT_DIR}" -maxdepth 1 -type f \( -name '*.aab' -o -name '*.apk' \) -print)
  fi
  APP_VERSION_CODE="$((MAX_VERSION_CODE + 1))"
fi

case "${TASK}" in
  bundleRelease|assembleRelease)
    ;;
  *)
    echo "Unsupported Gradle task: ${TASK}" >&2
    echo "Use bundleRelease or assembleRelease." >&2
    exit 1
    ;;
esac

if [[ "${STRICT_SIGNING}" == "1" && ! -f "${KEYSTORE_PROPERTIES}" ]]; then
  echo "Missing ${KEYSTORE_PROPERTIES}." >&2
  echo "Create it from frontend/android/keystore.properties.example before building a store release." >&2
  exit 1
fi

echo "Preparing native web assets..."
cd "${FRONTEND_DIR}"
npm run cap:android

if [[ "${STORE_CHANNEL}" == "huawei" ]]; then
  GRADLE_FLAVOR="Huawei"
  OUTPUT_FLAVOR="huawei"
else
  GRADLE_FLAVOR="Google"
  OUTPUT_FLAVOR="google"
fi

GRADLE_TASK="${TASK/Release/${GRADLE_FLAVOR}Release}"
OUTPUT_VARIANT="${OUTPUT_FLAVOR}Release"
OUTPUT_AAB="${ANDROID_DIR}/app/build/outputs/bundle/${OUTPUT_VARIANT}/app-${OUTPUT_FLAVOR}-release.aab"
OUTPUT_APK="${ANDROID_DIR}/app/build/outputs/apk/${OUTPUT_FLAVOR}/release/app-${OUTPUT_FLAVOR}-release.apk"

echo "Building Android ${GRADLE_TASK} for ${STORE_CHANNEL} (version ${APP_VERSION_NAME} / code ${APP_VERSION_CODE})..."
cd "${ANDROID_DIR}"
./gradlew "${GRADLE_TASK}" \
  -PappVersionName="${APP_VERSION_NAME}" \
  -PappVersionCode="${APP_VERSION_CODE}"

mkdir -p "${STORE_OUTPUT_DIR}"

if [[ "${TASK}" == "bundleRelease" ]]; then
  FINAL_OUTPUT="${STORE_OUTPUT_DIR}/ag8te-${STORE_CHANNEL}-${APP_VERSION_NAME}-${APP_VERSION_CODE}.aab"
  cp "${OUTPUT_AAB}" "${FINAL_OUTPUT}"
  echo "Android App Bundle ready at ${FINAL_OUTPUT}"
else
  FINAL_OUTPUT="${STORE_OUTPUT_DIR}/ag8te-${STORE_CHANNEL}-${APP_VERSION_NAME}-${APP_VERSION_CODE}.apk"
  cp "${OUTPUT_APK}" "${FINAL_OUTPUT}"
  echo "Android APK ready at ${FINAL_OUTPUT}"
fi
