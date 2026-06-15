#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
IOS_DIR="${FRONTEND_DIR}/ios/App"
ARCHIVE_PATH="${IOS_DIR}/output/MzansiServe.xcarchive"
EXPORT_DIR="${IOS_DIR}/output/export"
STORE_OUTPUT_DIR="${FRONTEND_DIR}/store-builds/apple"

APP_VERSION_NAME="${APP_VERSION_NAME:-1.0.0}"
APP_VERSION_CODE="${APP_VERSION_CODE:-1}"
IOS_EXPORT_OPTIONS_PLIST="${IOS_EXPORT_OPTIONS_PLIST:-${IOS_DIR}/ExportOptions.plist}"

if [[ ! -f "${IOS_EXPORT_OPTIONS_PLIST}" ]]; then
  echo "Missing iOS export options plist: ${IOS_EXPORT_OPTIONS_PLIST}" >&2
  exit 1
fi

echo "Preparing native web assets..."
cd "${FRONTEND_DIR}"
npm run cap:ios

echo "Building iOS version ${APP_VERSION_NAME} / build ${APP_VERSION_CODE}..."
cd "${IOS_DIR}"

rm -rf "${ARCHIVE_PATH}" "${EXPORT_DIR}"
mkdir -p "${EXPORT_DIR}" "${STORE_OUTPUT_DIR}"

BUILD_ARGS=(
  -project App.xcodeproj
  -scheme App
  -configuration Release
  -destination "generic/platform=iOS"
  -archivePath "${ARCHIVE_PATH}"
  MARKETING_VERSION="${APP_VERSION_NAME}"
  CURRENT_PROJECT_VERSION="${APP_VERSION_CODE}"
  archive
)

if [[ -n "${APPLE_TEAM_ID:-}" ]]; then
  BUILD_ARGS+=(DEVELOPMENT_TEAM="${APPLE_TEAM_ID}")
fi

if [[ -n "${IOS_PROVISIONING_PROFILE_NAME:-}" ]]; then
  BUILD_ARGS+=(
    CODE_SIGN_STYLE=Manual
    CODE_SIGN_IDENTITY="Apple Distribution"
    PROVISIONING_PROFILE_SPECIFIER="${IOS_PROVISIONING_PROFILE_NAME}"
  )
fi

xcodebuild "${BUILD_ARGS[@]}"
xcodebuild \
  -exportArchive \
  -archivePath "${ARCHIVE_PATH}" \
  -exportPath "${EXPORT_DIR}" \
  -exportOptionsPlist "${IOS_EXPORT_OPTIONS_PLIST}"

IPA_PATH="$(find "${EXPORT_DIR}" -maxdepth 1 -name '*.ipa' -print -quit)"
if [[ -z "${IPA_PATH}" ]]; then
  echo "The iOS export completed without producing an IPA." >&2
  exit 1
fi

FINAL_OUTPUT="${STORE_OUTPUT_DIR}/mzansiserve-apple-${APP_VERSION_NAME}-${APP_VERSION_CODE}.ipa"
cp "${IPA_PATH}" "${FINAL_OUTPUT}"
echo "iOS IPA ready at ${FINAL_OUTPUT}"
