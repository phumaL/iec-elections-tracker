# IEC Elections Tracker

An unofficial Expo/React Native companion for the **2026 South African municipal
elections**. It reads the same public result files as the
[IEC results dashboard](https://results.elections.org.za/dashboards/lge/) and
presents them live on Android, iOS and the web.

**[Download the Android APK](https://github.com/phumaL/iec-elections-tracker/releases/latest)**
from the latest GitHub release.

- National overview with voting-district progress, council control and party standings
- Drill down from province to municipality, with ward detail on demand
- Party pages with current support, historical trend and provincial breakdown
- Live updates, pull-to-refresh, offline snapshot and light/dark themes
- A deliberately small data footprint — see [Data budget](#data-budget)

> This app is not affiliated with the Electoral Commission. Results are read from
> public IEC feeds and should always be verified against the official dashboard.

## Install on Android

1. Open the [latest release](https://github.com/phumaL/iec-elections-tracker/releases/latest)
   on your phone and download the `.apk` file.
2. Allow installs from your browser/file manager when Android asks.
3. Open **IEC Elections Tracker**.

The APK is signed and targets Android 7.0 and newer. Two builds are published:
`iec-elections-tracker-1.0.2.apk` (32 MB, arm64-v8a, covers 95%+ of devices)
and `iec-elections-tracker-1.0.2-armeabi-v7a.apk` (24 MB, older 32-bit phones).
It is an unofficial app and is not affiliated with the Electoral Commission.

## Requirements for development

- Node.js 20 or newer
- npm
- Expo Go on a device, or a local development build for native modules
- For local Android release builds: JDK 21 and the Android SDK (platform 36,
  build-tools 36, NDK 27.1, CMake 3.22)

## Getting started

```sh
npm install
npm start
```

Then press `a` for Android, `i` for iOS, or `w` for the web preview. Native
builds talk to the IEC host directly.

### Web preview

Browsers cannot call the IEC host because it does not send CORS headers. Run the
bundled local proxy in a second terminal:

```sh
npm run proxy   # http://localhost:8787/proxy
npm run web
```

The app automatically uses `http://localhost:8787/proxy` on web in development.
For a deployed web build, point `EXPO_PUBLIC_IEC_PROXY` at your own proxy:

```sh
EXPO_PUBLIC_IEC_PROXY=https://your-proxy.example.com/proxy npm run web
```

The proxy only forwards `https://results.elections.org.za/...` and passes
through `ETag` / `Last-Modified` and conditional request headers.

## Data budget

The IEC dashboard downloads large reference files on every visit. This app avoids
that where possible:

| Item | Naive approach | What the app does |
| --- | --- | --- |
| National feed | Full poll every 30 s | Conditional GET with `If-None-Match`; unchanged polls return a body-less **304**. Default poll 60 s. |
| Party names/logos | 471 KB `PartyList.js` | **Bundled 2.9 KB** for the 21 parties contesting 2026. |
| History | 1.4 MB `HistoryYearsNational.js` | **Bundled 6 KB** of national/provincial history for those parties. |
| Cached snapshot | Raw national file | `compactNational()` strips empty `WardResults` before storing in AsyncStorage. |
| Municipality list | Only what the live feed has counted | All 213 municipalities bundled from the completed 2021 feed; live entries override them. |
| Municipality wards | 10–20 MB file | Opt-in only, never polled, one municipality kept in memory. |
| Backgrounded app | Timer keeps running | Polling pauses; refresh on return only if the last check is older than 15 s. |
| Failures | Hammer the server | Exponential backoff up to 5 minutes, reset on success. |

The bundled party, history and municipality reference files are generated from the IEC feeds:

```sh
npm run data:build
```

Re-run this as counting progresses (new parties appear) or when the reference
election changes. It writes `src/data/parties.ts`, `src/data/history.ts` and
`src/data/municipalities.ts`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm start` | Start the Expo dev server |
| `npm run android` | Start on an Android device/emulator |
| `npm run ios` | Start on an iOS simulator/device |
| `npm run web` | Start the web preview |
| `npm run proxy` | Run the local CORS/conditional-GET proxy |
| `npm run data:build` | Regenerate bundled party and history data |
| `npm run typecheck` | Run TypeScript with no emit |
| `npm run lint` | Run Expo ESLint |

## Android release builds

Release APKs are signed with a private keystore that must stay outside the repo.
Create one once and keep a backup:

```sh
keytool -genkeypair -v -storetype PKCS12 \
  -keystore ~/.android/iec-elections-release.keystore \
  -alias iec-elections \
  -keyalg RSA -keysize 4096 -validity 10000 \
  -storepass "$STORE_PASSWORD" -keypass "$KEY_PASSWORD" \
  -dname "CN=IEC Elections Tracker, O=phumaL, C=ZA"
```

Add the signing values to `~/.gradle/gradle.properties` (never commit them):

```properties
IEC_UPLOAD_STORE_FILE=/home/you/.android/iec-elections-release.keystore
IEC_UPLOAD_KEY_ALIAS=iec-elections
IEC_UPLOAD_STORE_PASSWORD=...
IEC_UPLOAD_KEY_PASSWORD=...
```

Then generate the native project and build:

```sh
npx expo prebuild --platform android --clean
cd android
./gradlew assembleRelease
```

`expo prebuild` regenerates `android/`, so the release `signingConfig` must be
re-applied to `android/app/build.gradle` afterwards (or supplied by your own
config plugin). Check it before building:

```sh
grep IEC_UPLOAD android/app/build.gradle
```

The signed APK is written to
`android/app/build/outputs/apk/release/app-release.apk`. Install it over USB with
`adb install -r <path>`, or attach it to a GitHub release.

> Back up the keystore and passwords. If they are lost, existing installs cannot
> be updated in place.

## Project structure

```text
src/
  api/         IEC endpoints, conditional GET, errors
  app/         Expo Router screens (file-based routes)
  components/  Shared UI components
  context/     Settings, theme and live-results state
  data/        Generated party, history and municipality reference data
  hooks/       Clock and municipality-download hooks
  lib/         Derivation, formatting, party metadata, storage
  theme/       Light/dark palette and design tokens
  types/       IEC feed models
scripts/
  build-static-data.mjs   Regenerates src/data/*
  iec-proxy.mjs           Local CORS proxy for web
```

## Data source

Base URL: `https://results.elections.org.za/dashboards/lge`

The files are plain JSON served with a `.js` extension:

```text
National:      MapsJason/2026/EEID1887LiteMapsNational.js
Municipality:  MapsJason/2026/EEID1887Munic<MunicipalityID>.js
Party list:    MapsJason/2016/PartyList.js
History:       MapsJason/HistoryYears/HistoryYearsNational.js
```

The national Lite file already contains every province and municipality summary,
so one polling feed powers the overview, province and municipality screens.
Per-municipality files are only fetched when a person explicitly opens ward
detail.

See [`HANDOFF.md`](./HANDOFF.md) for feed quirks, architecture notes and current
status.

## Licence

See [`LICENSE`](./LICENSE).
