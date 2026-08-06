# AG8TE Mobile App Store Guide

This project now includes a Capacitor mobile shell around the existing React frontend so it can be prepared for:

- Google Play
- Apple App Store
- Huawei AppGallery

## What Is Already Done

- Capacitor is installed in [frontend/package.json](/Users/bingodedingo/Desktop/ag8te-main/frontend/package.json)
- Capacitor config exists in [frontend/capacitor.config.ts](/Users/bingodedingo/Desktop/ag8te-main/frontend/capacitor.config.ts)
- Native projects were created in:
  - [frontend/android](/Users/bingodedingo/Desktop/ag8te-main/frontend/android)
  - [frontend/ios](/Users/bingodedingo/Desktop/ag8te-main/frontend/ios)
- Native-safe geolocation is wired through [frontend/src/lib/native.ts](/Users/bingodedingo/Desktop/ag8te-main/frontend/src/lib/native.ts)
- Driver location sync and shared location lookup now use the native-safe helper
- Google web sign-in is hidden inside native app builds to avoid broken social login flows and Apple review risk
- Native builds default to the live API at `https://ag8te.com` if `VITE_API_URL` is not set
- Store download buttons now use environment-based URLs instead of pretending the listings already exist
- Branded native assets are generated from [frontend/src/assets/logo.jpeg](/Users/bingodedingo/Desktop/ag8te-main/frontend/src/assets/logo.jpeg) via [frontend/scripts/generate_mobile_assets.py](/Users/bingodedingo/Desktop/ag8te-main/frontend/scripts/generate_mobile_assets.py)
- Yoco payment returns now support the native app URL scheme `co.za.ag8te.app://app`
- Android release signing placeholders are ready in [frontend/android/app/build.gradle](/Users/bingodedingo/Desktop/ag8te-main/frontend/android/app/build.gradle) and [frontend/android/keystore.properties.example](/Users/bingodedingo/Desktop/ag8te-main/frontend/android/keystore.properties.example)
- Google Play and Huawei AppGallery release commands create store-labelled artifacts under `frontend/store-builds/<store>`
- iOS URL scheme and privacy usage strings are configured in [frontend/ios/App/App/Info.plist](/Users/bingodedingo/Desktop/ag8te-main/frontend/ios/App/App/Info.plist)
- An iOS signing template exists at [frontend/ios/App/StoreConfig.xcconfig.example](/Users/bingodedingo/Desktop/ag8te-main/frontend/ios/App/StoreConfig.xcconfig.example)

## Build Commands

From [frontend](/Users/bingodedingo/Desktop/ag8te-main/frontend):

```bash
npm run mobile:assets
npm run mobile:doctor
npm run cap:sync
npm run cap:open:android
npm run cap:open:ios
```

Useful shortcuts:

```bash
npm run cap:android
npm run cap:ios
npm run android:bundle:release
npm run huawei:bundle:release
npm run huawei:assemble:release
```

Before any store build, run:

```bash
npm run mobile:doctor
```

That check flags missing keystore files, Xcode setup issues, and deep-link/env mismatches before you waste time in Android Studio or Xcode.

These commands:

1. build the web app
2. regenerate branded native assets
3. copy it into the native shell
4. sync Capacitor plugins

## Automated Testing Releases

The repository includes a GitHub Actions workflow that builds and uploads the
deployed `main` branch to:

- Google Play internal testing
- Huawei AppGallery open testing
- Apple TestFlight

It is triggered after a successful `./deploy.sh --branch main` deployment.
Production rollout remains manual. Complete the one-time credential setup in
[MOBILE_RELEASE_AUTOMATION.md](/Users/bingodedingo/Desktop/ag8te-main/MOBILE_RELEASE_AUTOMATION.md)
before enabling the workflow.

Mobile versions are tracked in
[mobile-version.json](/Users/bingodedingo/Desktop/ag8te-main/mobile-version.json),
with release history in
[CHANGELOG.md](/Users/bingodedingo/Desktop/ag8te-main/CHANGELOG.md).

## App Assets

Regenerate branded icons and splash assets any time the logo changes:

```bash
cd /Users/bingodedingo/Desktop/ag8te-main/frontend
npm run mobile:assets
```

This updates:

- Android launcher icons and splash images in [frontend/android/app/src/main/res](/Users/bingodedingo/Desktop/ag8te-main/frontend/android/app/src/main/res)
- iOS app icon and splash images in [frontend/ios/App/App/Assets.xcassets](/Users/bingodedingo/Desktop/ag8te-main/frontend/ios/App/App/Assets.xcassets)
- master preview assets in [frontend/src/assets/mobile](/Users/bingodedingo/Desktop/ag8te-main/frontend/src/assets/mobile)
- the 512×512 Play Console listing icon at [frontend/src/assets/mobile/app-icon-google-play-512.png](/Users/bingodedingo/Desktop/ag8te-main/frontend/src/assets/mobile/app-icon-google-play-512.png)

## Environment Variables

Add these for mobile release builds:

```env
VITE_API_URL=https://ag8te.com
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key
VITE_GOOGLE_CLIENT_ID=your_web_google_client_id
VITE_PUBLIC_FRONTEND_URL=https://ag8te.com
VITE_MOBILE_APP_URL=co.za.ag8te.app://app

VITE_APPLE_APP_STORE_URL=
VITE_GOOGLE_PLAY_URL=
VITE_HUAWEI_APPGALLERY_URL=
```

Notes:

- `VITE_GOOGLE_CLIENT_ID` is still useful for the web version
- native builds currently hide Google sign-in
- the store URL variables are for the homepage app-promo buttons once the listings are live

Add this to backend runtime config for payment callbacks:

```env
MOBILE_APP_URL=co.za.ag8te.app://app
```

## Google Play

Open the Android project:

```bash
cd /Users/bingodedingo/Desktop/ag8te-main/frontend
npm run cap:open:android
```

Then in Android Studio:

1. let Gradle finish syncing
2. create `frontend/android/keystore.properties` from [frontend/android/keystore.properties.example](/Users/bingodedingo/Desktop/ag8te-main/frontend/android/keystore.properties.example)
3. place your release keystore at the `storeFile` path you choose
4. build a signed release bundle
5. upload the release artifact to Play Console

To replace the legacy brain image on the store listing, open **Grow users → Store presence → Main store listing** in Play Console and upload [app-icon-google-play-512.png](/Users/bingodedingo/Desktop/ag8te-main/frontend/src/assets/mobile/app-icon-google-play-512.png) as the app icon.

Release build notes:

- `versionCode` and `versionName` are ready in [frontend/android/app/build.gradle](/Users/bingodedingo/Desktop/ag8te-main/frontend/android/app/build.gradle)
- the native app scheme is already wired into the manifest
- the one-command release script now blocks store builds if [frontend/android/keystore.properties](/Users/bingodedingo/Desktop/ag8te-main/frontend/android/keystore.properties) is missing, so you do not accidentally upload a debug-signed artifact
- if you only want a compile-only local release build, you can still run `STRICT_SIGNING=0 npm run android:bundle:release`
- the verified local bundle path is [frontend/android/app/build/outputs/bundle/release/app-release.aab](/Users/bingodedingo/Desktop/ag8te-main/frontend/android/app/build/outputs/bundle/release/app-release.aab)
- override the release version at build time like this:

```bash
APP_VERSION_NAME=1.0.1 APP_VERSION_CODE=2 npm run android:bundle:release
```

The signed Google Play output is copied to:

```bash
frontend/store-builds/google-play/
```

Google Play currently requires new apps and updates to target Android 15 / API 35 or higher. This project is configured with `targetSdkVersion = 36`.

Important official references:

- [Android App Bundles](https://developer.android.com/guide/app-bundle)
- [Target API requirements for Google Play](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)

## Apple App Store

Open the iOS project:

```bash
cd /Users/bingodedingo/Desktop/ag8te-main/frontend
npm run cap:open:ios
```

Then in Xcode:

1. select your Apple Developer team
2. copy [frontend/ios/App/StoreConfig.xcconfig.example](/Users/bingodedingo/Desktop/ag8te-main/frontend/ios/App/StoreConfig.xcconfig.example) into your own local config if you want a tracked template for bundle/version settings
3. set the bundle identifier and signing
4. archive the app
5. upload it through Xcode / App Store Connect

Important local requirement:

- full Xcode must be installed, not only Command Line Tools
- if your machine is still pointing at Command Line Tools, switch it after installing Xcode:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

Project note:

- this Capacitor setup currently opens as [frontend/ios/App/App.xcodeproj](/Users/bingodedingo/Desktop/ag8te-main/frontend/ios/App/App.xcodeproj)
- if a top-level `App.xcworkspace` is added later by CocoaPods or another native dependency, use that instead
- if Xcode opens but there are no simulator devices available yet, install the iOS platform/runtime from `Xcode > Settings > Components` before trying simulator builds or archives

Important Apple references:

- [Submitting to the App Store](https://developer.apple.com/app-store/submitting/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

Apple review points that matter to this app:

- `4.2 Minimum Functionality`: the app cannot feel like a thin website wrapper
- `4.8 Sign in with Apple`: if social login becomes a primary native login option on iOS, Apple may require Sign in with Apple too

To reduce that risk, Google web sign-in is currently disabled inside native app builds.

## Huawei AppGallery

Huawei can use the Android codebase, but there is one important caveat:

- this app still depends on Google Maps in the UI
- the web experience also includes Google login on the website

That means the first Huawei release may work, but it is not yet a fully Huawei-native implementation.

Recommended path:

1. use the Android project as the AppGallery base
2. create the AppGallery listing using package name `co.za.ag8te.app`
3. add the release signing certificate SHA-256 fingerprint to the AppGallery Connect app
4. enable **Location Kit** for that app in **HMS API Services > API Library**
5. build the Huawei flavor
6. upload the APK or App Bundle to AppGallery Connect
7. test the full flow on a Huawei device
8. if maps or auth are inconsistent, add Huawei-specific replacements later

Build commands:

```bash
cd /Users/bingodedingo/Desktop/ag8te-main/frontend
APP_VERSION_NAME=1.0.1 APP_VERSION_CODE=2 npm run huawei:bundle:release
APP_VERSION_NAME=1.0.1 APP_VERSION_CODE=2 npm run huawei:assemble:release
```

Outputs are copied to:

```bash
frontend/store-builds/huawei/
```

Use the same signing key as Google Play unless you intentionally want separate store signing. Keeping one package name and one signing identity makes payment callbacks, deep links, and future cross-store updates simpler.

The Android project uses store-specific product flavors:

- `huaweiRelease` registers the local Capacitor `Geolocation` bridge backed by Huawei Location Kit `6.12.0.300`
- `googleRelease` retains `@capacitor/geolocation` and Google Play Services Location
- the release scripts select the correct flavor from `STORE_CHANNEL`; do not detect Huawei support from the phone manufacturer name
- `npx cap sync android` regenerates Capacitor dependencies, so `npm run cap:android` runs `scripts/configure_android_store_flavors.mjs` immediately afterward to restore the store-specific split

Huawei Location Kit authorization is tied to the AppGallery Connect package and signing certificate. If AppGallery Connect provides an `agconnect-services.json` file while enabling the service, place it in the location specified by the current Huawei console instructions before the device-validation build.

Current Huawei readiness notes:

- native builds hide Google web sign-in
- Huawei builds use Huawei Location Kit and exclude Google Play Services Location
- Google Play builds keep the standard Google-backed Capacitor geolocation implementation
- map screens still use Google Maps in the web UI, so a real Huawei device test is required before submission
- AppGallery requires listing information such as app name, package name, category, screenshots, release countries/regions, and privacy policy URL

Official Huawei references:

- [AppGallery Connect documentation](https://developer.huawei.com/consumer/en/doc/)
- [Publish apps with AppGallery Connect](https://developer.huawei.com/consumer/en/service/josp/agc/index.html)
- [Huawei AppGallery release overview](https://developer.huawei.com/consumer/en/appgallery/)

## Remaining App Store Checklist

Before submitting to stores, finish these:

- test the branded icons and splash screens on real Android and iPhone hardware
- set your real release versioning in Android and iOS projects
- test login, payments, maps, uploads, and live driver tracking on real devices
- define privacy/data safety answers for each store
- add store screenshots and marketing copy
- confirm Yoco browser redirect flows behave correctly inside the native system browser handoff
- create the final Android keystore and Apple signing profile/team config
- add final `VITE_APPLE_APP_STORE_URL`, `VITE_GOOGLE_PLAY_URL`, and `VITE_HUAWEI_APPGALLERY_URL` values after each listing is published

## Recommended Next Improvements

These are the next best upgrades after the first store-ready build:

- add push notifications for ride updates and shop orders
- add Apple Sign in if you want native social login on iPhone
- add Huawei HMS alternatives if Huawei users need a Google-free experience
- add universal links / associated domains if you want HTTPS links to open the app directly
