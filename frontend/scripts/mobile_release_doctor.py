#!/usr/bin/env python3

from __future__ import annotations

import plistlib
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


EXPECTED_APP_URL = "co.za.mzansiserve.app://app"
EXPECTED_URL_SCHEME = "co.za.mzansiserve.app"
EXPECTED_ANDROID_PACKAGE = "co.za.mzansiserve.app"
MIN_RECOMMENDED_TARGET_SDK = 35

SCRIPT_PATH = Path(__file__).resolve()
FRONTEND_DIR = SCRIPT_PATH.parent.parent
ROOT_DIR = FRONTEND_DIR.parent


@dataclass
class Finding:
    level: str
    label: str
    message: str


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip('"').strip("'")
    return values


def run_command(args: list[str]) -> tuple[int, str]:
    try:
        completed = subprocess.run(
            args,
            check=False,
            capture_output=True,
            text=True,
        )
        output = (completed.stdout or completed.stderr).strip()
        return completed.returncode, output
    except FileNotFoundError:
        return 127, f"{args[0]} is not installed"


def load_info_plist() -> dict:
    info_plist_path = FRONTEND_DIR / "ios/App/App/Info.plist"
    with info_plist_path.open("rb") as handle:
        return plistlib.load(handle)


def load_keystore_properties() -> dict[str, str]:
    return read_env_file(FRONTEND_DIR / "android/keystore.properties")


def color(level: str) -> str:
    return {
        "OK": "\033[92m",
        "WARN": "\033[93m",
        "FAIL": "\033[91m",
    }.get(level, "")


def reset_color() -> str:
    return "\033[0m"


def print_findings(title: str, findings: Iterable[Finding]) -> tuple[int, int, int]:
    ok = warn = fail = 0
    print(f"\n{title}")
    print("-" * len(title))
    for finding in findings:
        if finding.level == "OK":
            ok += 1
        elif finding.level == "WARN":
            warn += 1
        else:
            fail += 1
        marker = f"{color(finding.level)}[{finding.level}]{reset_color()}"
        print(f"{marker} {finding.label}: {finding.message}")
    return ok, warn, fail


def general_findings() -> list[Finding]:
    findings: list[Finding] = []
    checks = {
        "Capacitor config": FRONTEND_DIR / "capacitor.config.ts",
        "Android project": FRONTEND_DIR / "android",
        "iOS project": FRONTEND_DIR / "ios",
        "App icon master": FRONTEND_DIR / "src/assets/mobile/app-icon-master.png",
        "Splash master": FRONTEND_DIR / "src/assets/mobile/splash-master.png",
    }

    for label, path in checks.items():
        level = "OK" if path.exists() else "FAIL"
        findings.append(Finding(level, label, str(path)))

    return findings


def env_findings() -> list[Finding]:
    findings: list[Finding] = []
    dev_env = read_env_file(ROOT_DIR / ".env")
    prod_env = read_env_file(ROOT_DIR / ".env.production")

    mobile_app_url = prod_env.get("MOBILE_APP_URL") or dev_env.get("MOBILE_APP_URL")
    if mobile_app_url == EXPECTED_APP_URL:
        findings.append(Finding("OK", "Backend MOBILE_APP_URL", mobile_app_url))
    elif mobile_app_url:
        findings.append(
            Finding(
                "WARN",
                "Backend MOBILE_APP_URL",
                f"Expected {EXPECTED_APP_URL}, found {mobile_app_url}",
            )
        )
    else:
        findings.append(
            Finding(
                "WARN",
                "Backend MOBILE_APP_URL",
                f"Not set in .env or .env.production. The backend will fall back to {EXPECTED_APP_URL}.",
            )
        )

    frontend_mobile_url = (
        read_env_file(FRONTEND_DIR / ".env").get("VITE_MOBILE_APP_URL")
        or read_env_file(FRONTEND_DIR / ".env.production").get("VITE_MOBILE_APP_URL")
    )
    if frontend_mobile_url == EXPECTED_APP_URL:
        findings.append(Finding("OK", "Frontend VITE_MOBILE_APP_URL", frontend_mobile_url))
    elif frontend_mobile_url:
        findings.append(
            Finding(
                "WARN",
                "Frontend VITE_MOBILE_APP_URL",
                f"Expected {EXPECTED_APP_URL}, found {frontend_mobile_url}",
            )
        )
    else:
        findings.append(
            Finding(
                "OK",
                "Frontend VITE_MOBILE_APP_URL",
                f"Not set in frontend env files. The app will safely fall back to {EXPECTED_APP_URL}.",
            )
        )

    return findings


def store_listing_findings() -> list[Finding]:
    findings: list[Finding] = []
    frontend_env = {
        **read_env_file(FRONTEND_DIR / ".env"),
        **read_env_file(FRONTEND_DIR / ".env.production"),
    }
    store_vars = {
        "Apple App Store URL": "VITE_APPLE_APP_STORE_URL",
        "Google Play URL": "VITE_GOOGLE_PLAY_URL",
        "Huawei AppGallery URL": "VITE_HUAWEI_APPGALLERY_URL",
    }

    for label, key in store_vars.items():
        value = frontend_env.get(key, "")
        if value:
            findings.append(Finding("OK", label, value))
        else:
            findings.append(
                Finding(
                    "WARN",
                    label,
                    f"{key} is not set yet. The homepage download button will stay in coming-soon mode.",
                )
            )

    guide_path = ROOT_DIR / "MOBILE_APP_STORE_GUIDE.md"
    if guide_path.exists():
        findings.append(Finding("OK", "Store release guide", str(guide_path)))
    else:
        findings.append(Finding("FAIL", "Store release guide", "MOBILE_APP_STORE_GUIDE.md is missing."))

    return findings


def android_findings() -> list[Finding]:
    findings: list[Finding] = []
    keystore_path = FRONTEND_DIR / "android/keystore.properties"
    if not keystore_path.exists():
        findings.append(
            Finding(
                "WARN",
                "Android release signing",
                "frontend/android/keystore.properties is missing. Store release bundles will be blocked by the strict release script.",
            )
        )
    else:
        props = load_keystore_properties()
        required = ["storeFile", "storePassword", "keyAlias", "keyPassword"]
        missing = [key for key in required if not props.get(key)]
        if missing:
            findings.append(
                Finding(
                    "FAIL",
                    "Android keystore properties",
                    f"Missing keys: {', '.join(missing)}",
                )
            )
        else:
            store_file = Path(props["storeFile"])
            resolved_store_file = (
                store_file
                if store_file.is_absolute()
                else (FRONTEND_DIR / "android/app" / store_file).resolve()
            )
            if resolved_store_file.exists():
                findings.append(
                    Finding(
                        "OK",
                        "Android keystore file",
                        str(resolved_store_file),
                    )
                )
            else:
                findings.append(
                    Finding(
                        "FAIL",
                        "Android keystore file",
                        f"Configured storeFile does not exist: {resolved_store_file}",
                    )
                )

    manifest_path = FRONTEND_DIR / "android/app/src/main/AndroidManifest.xml"
    manifest_text = manifest_path.read_text(encoding="utf-8")
    if EXPECTED_URL_SCHEME in manifest_text or "appUrlScheme" in manifest_text:
        findings.append(
            Finding("OK", "Android deep link intent filter", "Custom app URL scheme is configured in AndroidManifest.xml")
        )
    else:
        findings.append(
            Finding("FAIL", "Android deep link intent filter", "Could not find the mobile app URL scheme in AndroidManifest.xml")
        )

    gradle_path = FRONTEND_DIR / "android/app/build.gradle"
    gradle_text = gradle_path.read_text(encoding="utf-8")
    variables_text = (FRONTEND_DIR / "android/variables.gradle").read_text(encoding="utf-8")

    if f'applicationId "{EXPECTED_ANDROID_PACKAGE}"' in gradle_text:
        findings.append(Finding("OK", "Android package name", EXPECTED_ANDROID_PACKAGE))
    else:
        findings.append(
            Finding(
                "FAIL",
                "Android package name",
                f"Expected applicationId {EXPECTED_ANDROID_PACKAGE} in android/app/build.gradle",
            )
        )

    if "targetSdkVersion = 36" in variables_text or "targetSdkVersion = 35" in variables_text:
        findings.append(
            Finding(
                "OK",
                "Android target SDK",
                f"targetSdkVersion is at least {MIN_RECOMMENDED_TARGET_SDK}.",
            )
        )
    else:
        findings.append(
            Finding(
                "WARN",
                "Android target SDK",
                f"Confirm targetSdkVersion is at least {MIN_RECOMMENDED_TARGET_SDK} for current store policy.",
            )
        )

    if "Release keystore not configured" in gradle_text:
        findings.append(
            Finding("OK", "Android release fallback", "build.gradle includes a debug-signing fallback for local compile-only release builds")
        )

    return findings


def huawei_findings() -> list[Finding]:
    findings: list[Finding] = []
    package_json = (FRONTEND_DIR / "package.json").read_text(encoding="utf-8")
    build_script = (FRONTEND_DIR / "scripts/build_android_release.sh").read_text(encoding="utf-8")
    native_helper = (FRONTEND_DIR / "src/lib/native.ts").read_text(encoding="utf-8")

    if "huawei:bundle:release" in package_json and "huawei:assemble:release" in package_json:
        findings.append(Finding("OK", "Huawei release commands", "Huawei AppGallery build commands are available."))
    else:
        findings.append(Finding("FAIL", "Huawei release commands", "Missing Huawei release scripts in frontend/package.json."))

    if "STORE_CHANNEL" in build_script and "store-builds" in build_script:
        findings.append(Finding("OK", "Store-labelled Android artifacts", "Release artifacts are copied into frontend/store-builds/<store>."))
    else:
        findings.append(Finding("FAIL", "Store-labelled Android artifacts", "Android release script does not label store output artifacts."))

    if "canUseGoogleOAuth = () => !isNativeApp" in native_helper:
        findings.append(Finding("OK", "Huawei Google sign-in risk", "Native app builds hide web Google OAuth."))
    else:
        findings.append(Finding("WARN", "Huawei Google sign-in risk", "Confirm native Huawei builds do not expose broken Google web OAuth."))

    findings.append(
        Finding(
            "WARN",
            "Huawei device validation",
            "Test maps, geolocation, login, payments, and driver tracking on a Huawei device before AppGallery submission.",
        )
    )

    return findings


def ios_findings() -> list[Finding]:
    findings: list[Finding] = []
    plist = load_info_plist()
    url_types = plist.get("CFBundleURLTypes", [])
    has_scheme = any(
        EXPECTED_URL_SCHEME in url_type.get("CFBundleURLSchemes", [])
        for url_type in url_types
        if isinstance(url_type, dict)
    )

    if has_scheme:
        findings.append(Finding("OK", "iOS URL scheme", EXPECTED_URL_SCHEME))
    else:
        findings.append(Finding("FAIL", "iOS URL scheme", "Info.plist is missing the expected mobile app URL scheme"))

    xcode_app = Path("/Applications/Xcode.app")
    if xcode_app.exists():
        findings.append(Finding("OK", "Xcode.app", str(xcode_app)))
    else:
        findings.append(
            Finding(
                "FAIL",
                "Xcode.app",
                "Full Xcode is not installed in /Applications. Command Line Tools alone cannot archive an App Store build.",
            )
        )

    code, selected_path = run_command(["xcode-select", "-p"])
    if code == 0 and "Xcode.app/Contents/Developer" in selected_path:
        findings.append(Finding("OK", "xcode-select", selected_path))
    elif code == 0:
        findings.append(
            Finding(
                "WARN",
                "xcode-select",
                f"Currently pointing to {selected_path}. Switch to /Applications/Xcode.app/Contents/Developer before archiving.",
            )
        )
    else:
        findings.append(Finding("FAIL", "xcode-select", selected_path))

    identity_code, identities_output = run_command(["security", "find-identity", "-v", "-p", "codesigning"])
    if identity_code == 0 and "valid identities found" in identities_output:
        first_line = identities_output.splitlines()[0] if identities_output.splitlines() else identities_output
        if not first_line.strip().startswith("0 valid identities found"):
            findings.append(Finding("OK", "Apple signing identity", first_line.strip()))
        else:
            findings.append(
                Finding(
                    "WARN",
                    "Apple signing identity",
                    "No valid Apple code-signing identity is installed. Sign into Xcode with the Apple Developer account or install signing certificates before archiving.",
                )
            )
    else:
        findings.append(Finding("WARN", "Apple signing identity", identities_output or "Could not inspect codesigning identities."))

    simctl_code, runtimes_output = run_command(["xcrun", "simctl", "list", "runtimes"])
    runtime_lines = [line.strip() for line in runtimes_output.splitlines() if line.strip()]
    available_ios_runtime = any(
        line.startswith("iOS ") and "unavailable" not in line.lower()
        for line in runtime_lines
    )

    if available_ios_runtime:
        findings.append(
            Finding(
                "OK",
                "iOS simulator runtime",
                "At least one iOS simulator runtime is installed and available.",
            )
        )
    elif simctl_code == 0:
        findings.append(
            Finding(
                "FAIL",
                "iOS simulator runtime",
                "No available iOS simulator runtime was found. Install the iOS platform/runtime from Xcode > Settings > Components or finish `xcodebuild -downloadPlatform iOS`.",
            )
        )
    else:
        findings.append(Finding("FAIL", "iOS simulator runtime", runtimes_output))

    return findings


def next_steps(failures: int) -> list[str]:
    steps = []
    if failures:
        steps.append("Fix the FAIL items above first.")
    steps.extend(
        [
            "Run `npm run android:bundle:release` from frontend when Android signing is ready.",
            "Run `npm run huawei:bundle:release` or `npm run huawei:assemble:release` for AppGallery once Android signing is ready.",
            "Open `frontend/ios/App/App.xcodeproj` in Xcode to configure the Apple team, signing, and archive settings.",
            "Test the Yoco payment return flow on a real device before store submission.",
        ]
    )
    return steps


def main() -> int:
    print("MzansiServe Mobile Release Doctor")
    print(f"Workspace: {ROOT_DIR}")

    totals = [0, 0, 0]
    for title, findings in [
        ("General", general_findings()),
        ("Environment", env_findings()),
        ("Store Listings", store_listing_findings()),
        ("Android", android_findings()),
        ("Huawei AppGallery", huawei_findings()),
        ("iOS", ios_findings()),
    ]:
        counts = print_findings(title, findings)
        totals = [current + delta for current, delta in zip(totals, counts)]

    ok, warn, fail = totals
    print("\nSummary")
    print("-------")
    print(f"OK: {ok}")
    print(f"WARN: {warn}")
    print(f"FAIL: {fail}")

    print("\nNext Steps")
    print("----------")
    for step in next_steps(fail):
        print(f"- {step}")

    return 1 if fail else 0


if __name__ == "__main__":
    sys.exit(main())
