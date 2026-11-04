# IEC Live Results

An unofficial Expo/React Native companion for the **2026 South African municipal
elections**. It reads the same public result files as the
[IEC results dashboard](https://results.elections.org.za/dashboards/lge/) and
presents them live on Android, iOS and the web.

- National overview with voting-district progress, council control and party standings
- Drill down from province to municipality, with ward detail on demand
- Party pages with current support, historical trend and provincial breakdown
- Live updates, pull-to-refresh, offline snapshot and light/dark themes
- A deliberately small data footprint — see [Data budget](#data-budget)

> This app is not affiliated with the Electoral Commission. Results are read from
> public IEC feeds and should always be verified against the official dashboard.

## Requirements

- Node.js 20 or newer
- npm
- Expo Go on a device, or a local development build for native modules

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
| Municipality wards | 10–20 MB file | Opt-in only, never polled, one municipality kept in memory. |
| Backgrounded app | Timer keeps running | Polling pauses; refresh on return only if the last check is older than 15 s. |
| Failures | Hammer the server | Exponential backoff up to 5 minutes, reset on success. |

The bundled party and history files are generated from the live IEC feeds:

```sh
npm run data:build
```

Re-run this only if the candidate lists or historical results change. It writes
`src/data/parties.ts` and `src/data/history.ts`.

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

## Project structure

```text
src/
  api/         IEC endpoints, conditional GET, errors
  app/         Expo Router screens (file-based routes)
  components/  Shared UI components
  context/     Settings, theme and live-results state
  data/        Generated party and history reference data
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
