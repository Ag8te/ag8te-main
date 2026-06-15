# Mobile Release Automation

The `Mobile Store Testing Release` GitHub Actions workflow turns the current
Capacitor web build into testing releases for:

- Google Play internal testing
- Huawei AppGallery Connect
- Apple TestFlight

It runs after a successful full `main` deployment through `./deploy.sh`. It
can also be started manually from GitHub Actions with optional release notes.

Production rollout remains manual so a web change cannot accidentally become
a public mobile release before device testing and store review checks.

## One-Time GitHub Setup

In the GitHub repository, open:

`Settings > Environments > New environment`

Create an environment named:

`mobile-testing`

Add these environment secrets.

### Shared Android Signing

| Secret | Value |
| --- | --- |
| `ANDROID_KEYSTORE_BASE64` | Base64-encoded MzansiServe release keystore |
| `ANDROID_KEYSTORE_PASSWORD` | Release keystore password |
| `ANDROID_KEY_ALIAS` | Release key alias |
| `ANDROID_KEY_PASSWORD` | Release key password |

Encode the local keystore on macOS:

```bash
base64 -i /path/to/mzansiserve-release.keystore | pbcopy
```

### Google Play

| Secret | Value |
| --- | --- |
| `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` | Complete Google Play service-account JSON |

The service account must have release access to `co.za.mzansiserve.app`.
Google Play API access must be enabled and the internal testing track must
exist.

### Huawei AppGallery

| Secret | Value |
| --- | --- |
| `HUAWEI_CLIENT_ID` | AppGallery Connect API client ID |
| `HUAWEI_CLIENT_SECRET` | AppGallery Connect API client secret |
| `HUAWEI_APP_ID` | Numeric AppGallery Connect app ID |
| `HUAWEI_FEEDBACK_EMAIL` | Email shown to AppGallery open-testing users |

The workflow submits the build to AppGallery open testing, not public
production. Test maps, location, login, and payments on a Huawei device before
promoting the build.

### Apple App Store Connect

| Secret | Value |
| --- | --- |
| `APPLE_TEAM_ID` | Apple Developer team ID |
| `APPLE_API_KEY_ID` | App Store Connect API key ID |
| `APPLE_API_ISSUER_ID` | App Store Connect API issuer ID |
| `APPLE_API_KEY_BASE64` | Base64-encoded App Store Connect `.p8` key |
| `IOS_CERTIFICATE_BASE64` | Base64-encoded App Store distribution `.p12` |
| `IOS_CERTIFICATE_PASSWORD` | Password used when exporting the `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | Base64-encoded App Store provisioning profile |
| `IOS_PROVISIONING_PROFILE_NAME` | Provisioning profile name shown in Apple Developer |
| `IOS_KEYCHAIN_PASSWORD` | A strong temporary CI keychain password |

Encode Apple files on macOS:

```bash
base64 -i AuthKey_ABC123.p8 | pbcopy
base64 -i MzansiServe_Distribution.p12 | pbcopy
base64 -i MzansiServe_AppStore.mobileprovision | pbcopy
```

## Versioning

The single source of truth is:

`mobile-version.json`

It contains the public semantic version and a monotonically increasing build
base. Testing builds combine that build base with the GitHub workflow run
number, producing a unique Android version code and iOS build number.

Before uploading, the automation checks Google Play and TestFlight and rejects
build numbers that have already been used.

Huawei does not expose the same version-code lookup through the configured
upload plugin, so Huawei safety comes from the shared monotonically increasing
build-number scheme used by all three stores.

Do not edit version files manually for normal releases. Run the
`Create Mobile Version Release` workflow and select `patch`, `minor`, or
`major`. Run that workflow from `main`. It:

1. Bumps `mobile-version.json`.
2. Generates release notes from Git commits.
3. Updates `CHANGELOG.md`.
4. Commits the version change.
5. Creates an annotated Git tag such as `v1.1.0`.
6. Creates a GitHub Release.
7. Leaves the new version ready for the next successful `main` deployment.

The GitHub Actions token needs permission to push the release commit and tag
to the selected release branch. If branch protection blocks automated pushes,
allow the GitHub Actions bot for this release workflow or use a dedicated
release branch.

## Local Commands

```bash
cd frontend

APP_VERSION_NAME=1.0.2 APP_VERSION_CODE=3 npm run android:bundle:release
APP_VERSION_NAME=1.0.2 APP_VERSION_CODE=3 npm run huawei:bundle:release
APP_VERSION_NAME=1.0.2 APP_VERSION_CODE=3 npm run ios:archive:release
```

Store-ready local artifacts are placed under:

```text
frontend/store-builds/
```

## Release Flow

1. Complete and test the web feature.
2. Merge it into `main`.
3. Run `./deploy.sh --branch main`.
4. After deployment and health checks succeed, `deploy.sh` starts the mobile
   store testing workflow.
5. GitHub Actions builds and uploads testing releases.
6. Test Android internal testing, Huawei, and TestFlight builds.
7. Promote approved builds to production in each store console.

Only a full deployment of `main` triggers mobile store testing. The following
never trigger it:

- deploying another branch
- `--env-only`
- `--restart-only`
- `--logs`
- `--setup`

To intentionally deploy `main` without starting mobile builds:

```bash
./deploy.sh --branch main --skip-mobile-release
```

The deployment machine must either have authenticated GitHub CLI access or a
`GH_TOKEN` environment variable with GitHub Actions write permission. If the
deployment succeeds but GitHub authentication is unavailable, deployment
remains successful and the script prints a visible mobile-trigger warning.
