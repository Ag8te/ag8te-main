#!/usr/bin/env python3

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VERSION_FILE = ROOT / "mobile-version.json"
CHANGELOG_FILE = ROOT / "CHANGELOG.md"
VERSION_PATTERN = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
BUILD_STRIDE = 100_000


def load_version() -> dict[str, int | str]:
    data = json.loads(VERSION_FILE.read_text(encoding="utf-8"))
    version = str(data.get("version", ""))
    build_base = data.get("build_base")
    if not VERSION_PATTERN.fullmatch(version):
        raise SystemExit(f"Invalid semantic version in {VERSION_FILE}: {version}")
    if not isinstance(build_base, int) or build_base < 1:
        raise SystemExit(f"build_base must be a positive integer in {VERSION_FILE}")
    return {"version": version, "build_base": build_base}


def git(*args: str) -> str:
    result = subprocess.run(
        ["git", *args],
        cwd=ROOT,
        check=True,
        capture_output=True,
        text=True,
    )
    return result.stdout.strip()


def write_github_output(values: dict[str, str | int]) -> None:
    output_path = os.environ.get("GITHUB_OUTPUT")
    lines = [f"{key}={value}" for key, value in values.items()]
    if output_path:
        with Path(output_path).open("a", encoding="utf-8") as handle:
            handle.write("\n".join(lines) + "\n")
    for line in lines:
        print(line)


def resolve(run_number: int) -> None:
    data = load_version()
    if run_number < 1 or run_number >= BUILD_STRIDE:
        raise SystemExit(f"Run number must be between 1 and {BUILD_STRIDE - 1}.")
    build_code = int(data["build_base"]) * BUILD_STRIDE + run_number
    if build_code > 2_100_000_000:
        raise SystemExit("Resolved Android version code exceeds the supported limit.")
    write_github_output(
        {
            "version_name": data["version"],
            "version_code": build_code,
            "tag": f"v{data['version']}",
        }
    )


def latest_tag() -> str | None:
    tags = git("tag", "--list", "v[0-9]*", "--sort=-version:refname").splitlines()
    return tags[0] if tags else None


def generated_notes() -> str:
    tag = latest_tag()
    revision_range = f"{tag}..HEAD" if tag else "HEAD"
    subjects = git("log", "--no-merges", "--pretty=format:%s", revision_range).splitlines()
    notes: list[str] = []
    for subject in subjects:
        clean = subject.replace("\\n", " ").strip()
        clean = re.sub(r"\s+", " ", clean)
        if clean and clean not in notes:
            notes.append(clean[:180])
        if len(notes) == 50:
            break
    return "\n".join(f"- {subject}" for subject in notes) or (
        "- Mobile experience, performance, and stability improvements."
    )


def changelog_notes(version: str) -> str:
    text = CHANGELOG_FILE.read_text(encoding="utf-8")
    match = re.search(
        rf"^## \[{re.escape(version)}\][^\n]*\n\n(?P<body>.*?)(?=^## \[|\Z)",
        text,
        re.MULTILINE | re.DOTALL,
    )
    return match.group("body").strip() if match else generated_notes()


def bump_version(current: str, bump: str, custom: str | None) -> str:
    if custom:
        if not VERSION_PATTERN.fullmatch(custom):
            raise SystemExit(f"Invalid custom semantic version: {custom}")
        return custom

    major, minor, patch = (int(part) for part in current.split("."))
    if bump == "major":
        return f"{major + 1}.0.0"
    if bump == "minor":
        return f"{major}.{minor + 1}.0"
    return f"{major}.{minor}.{patch + 1}"


def bump(bump_type: str, custom: str | None) -> None:
    data = load_version()
    old_version = str(data["version"])
    new_version = bump_version(old_version, bump_type, custom)
    if new_version == old_version:
        raise SystemExit("The new version must differ from the current version.")

    existing_tags = git("tag", "--list", f"v{new_version}")
    if existing_tags:
        raise SystemExit(f"Git tag v{new_version} already exists.")

    notes = generated_notes()
    VERSION_FILE.write_text(
        json.dumps(
            {"version": new_version, "build_base": int(data["build_base"]) + 1},
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    changelog = CHANGELOG_FILE.read_text(encoding="utf-8")
    heading = f"## [{new_version}] - {date.today().isoformat()}\n\n{notes}\n\n"
    if "## [Unreleased]\n" not in changelog:
        raise SystemExit("CHANGELOG.md must contain an [Unreleased] section.")
    changelog = changelog.replace(
        "## [Unreleased]\n",
        f"## [Unreleased]\n\n{heading}",
        1,
    )
    CHANGELOG_FILE.write_text(changelog, encoding="utf-8")
    write_github_output(
        {
            "version_name": new_version,
            "tag": f"v{new_version}",
            "notes_file": "release-notes.md",
        }
    )
    (ROOT / "release-notes.md").write_text(notes + "\n", encoding="utf-8")


def notes(version: str | None) -> None:
    selected = version or str(load_version()["version"])
    print(changelog_notes(selected))


def main() -> None:
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)

    resolve_parser = subparsers.add_parser("resolve")
    resolve_parser.add_argument("--run-number", required=True, type=int)

    subparsers.add_parser("check")

    notes_parser = subparsers.add_parser("notes")
    notes_parser.add_argument("--version")

    bump_parser = subparsers.add_parser("bump")
    bump_parser.add_argument("--type", choices=("patch", "minor", "major"), default="patch")
    bump_parser.add_argument("--custom")

    args = parser.parse_args()
    if args.command == "resolve":
        resolve(args.run_number)
    elif args.command == "check":
        data = load_version()
        tag = f"v{data['version']}"
        if git("tag", "--list", tag):
            print(f"Tracked release tag exists: {tag}")
        else:
            print(f"Tracked version is valid and unreleased: {tag}")
    elif args.command == "notes":
        notes(args.version)
    else:
        bump(args.type, args.custom)


if __name__ == "__main__":
    main()
