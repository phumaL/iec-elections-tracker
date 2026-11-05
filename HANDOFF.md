# Handoff — IEC Elections Tracker (React Native / Expo)

Updated: 2026-11-05, during the live 2026 South African municipal election count.

An unofficial Expo app that tracks the 2026 municipal election results from the
same public feeds used by the IEC dashboard:

- Dashboard: <https://results.elections.org.za/dashboards/lge/>
- Source: plain JSON served with a `.js` extension
- Platforms: Android/iOS first; web supported through a small local CORS proxy

## Data budget — read this first

The IEC dashboard is data-hungry, so the app is deliberately frugal:

| Item | Naive approach | What the app does now |
| --- | --- | --- |
| National feed | Full poll every 30 s | **Conditional GET** with `If-None-Match`; unchanged polls return a body-less **304**. Default poll 60 s; 30 s / 2 min / manual optional. |
| Party names/logos | 471 KB `PartyList.js` | **Bundled ~2.5 KB** `src/data/parties.ts` for the parties that have counted votes so far (18 at the last regeneration). |
| History | 1.4 MB `HistoryYearsNational.js` | **Bundled ~6 KB** `src/data/history.ts` with only national/provincial rows for those parties. |
| Municipality list | Only what the live feed has counted | **Bundled all 213** from the completed 2021 feed; live entries override them. |
| Cached snapshot | Raw national file | `compactNational()` strips empty `WardResults`; ~80–92 KB early in the count, low hundreds of KB when complete. |
| Municipality wards | 10–20 MB file | Opt-in only, no polling, one municipality kept in memory, explicit reload. |
| App backgrounded | Timer keeps running | Polling paused; refreshed on return only if the last check is older than 15 s. Manual-only mode never auto-refreshes. |
| Failures | Hammer the server | Exponential backoff up to 5 minutes, reset on success. |

All three bundled files are generated from the live IEC feeds:

```sh
npm run data:build
```

Re-run as counting progresses (new parties appear) or when the reference election changes. The national
snapshot stores its `ETag`/`Last-Modified` so a cold start can validate the cache
instead of downloading it again. `npm run proxy` forwards those conditional
headers for the web preview and allows them in CORS.

Why 60 s by default: the IEC edge cache refreshes around once a minute, so
polling faster mostly returns identical bytes. A 304 still costs a round trip, so
60 s is the honest "live" default; 30 s is available during the count.

## Status at a glance

### Done

- Expo SDK 58 / React Native 0.88 / TypeScript 6 project, Expo Router entry
- Data layer: typed IEC models, conditional national fetch, compact cache,
  derivation helpers, formatting, party metadata, bundled history
- Bundled all 213 municipalities from the completed 2021 feed; municipalities
  missing from the sparse 2026 feed show as "No results yet" instead of vanishing
- App shell: safe area, theme + settings + results providers, four tabs, detail
  routes, 404 screen
- Screens: national overview, areas, parties, settings, province, municipality,
  party detail
- Municipality ward detail is opt-in, cancellable, searchable and paginated
- Live polling: 30/60/120 s or manual, foreground refresh guard, background pause,
  exponential backoff, pull-to-refresh
- Local web proxy with CORS, conditional-header forwarding, GET/HEAD, streaming
- Light/dark theme; persisted refresh/theme settings; inline clear-cache confirm
  that works on native and web
- `README.md` and this handoff
- Signed Android release APK built locally with JDK 21 and the Android SDK
  (`com.phumal.iecelections`, v1.0.0/1); installed and launched on a physical
  Android 16 device

### Verified

- `npx tsc --noEmit` passes
- `npm run lint` (`expo lint`) passes
- `npx expo export --platform web` succeeds
- Proxy conditional fetch verified: first request `200` + `ETag` + body, second
  request with `If-None-Match` returns `304` and 0 bytes
- Live feed verified: 9 provinces, 213 municipalities listed (134 reporting at
  the time), parties appearing as they record votes, ~80–92 KB national file
  early in the count
- Device verified: Gauteng shows "7 of 9 municipalities reporting", pending
  councils are marked "No results yet", and the parties tab reports the number
  "with counted votes"

### Not yet done / suggested next steps

- No automated unit tests for `derive.ts` / `format.ts` or the conditional cache
- No automated UI/runtime test; only typecheck, lint, web export and proxy checks
- No EAS build profiles or CI workflow
- No analytics/crash reporting (deliberately, for privacy and data use)
- Web deploys need `EXPO_PUBLIC_IEC_PROXY` pointed at a hosted proxy
- Ward-level municipal files are intentionally not persisted; reopening one
  requires a fresh download
- Parties that have not recorded a vote anywhere cannot be listed: the IEC feed
  omits them and there is no 2026 candidate-list endpoint. Party metadata is
  regenerated as counting progresses, and the tab says "with counted votes"
  rather than claiming to show every contestant.

## Stack / project state

- Expo SDK **58.0.23**, React **19.3.0**, React Native **0.88.1**,
  TypeScript **6.0.3**
- **Expo Router** file-based routes in `src/app/` (required by `AGENTS.md`)
- `package.json` main is `expo-router/entry`
- Typed routes enabled (`experiments.typedRoutes`), `@/* -> ./src/*`
- `app.json`: name "IEC Elections Tracker", scheme `iecelections`, automatic UI
  style, bundle/package `com.phumal.iecelections` (deliberately not under an IEC
  domain), version `1.0.0` / versionCode `1`
- Installed deps include expo-router, safe-area-context, screens, linking,
  constants, status-bar, web/react-dom, @expo/vector-icons, expo-image,
  @react-native-async-storage/async-storage, react-native-svg, expo-haptics,
  expo-splash-screen
- Dev deps: eslint 9, eslint-config-expo, typescript 6
- `ios/` and `android/` are generated by Continuous Native Generation; never
  edit them by hand

## Commands

```sh
npm install
npm start                 # Expo dev server; press a / i / w
npm run proxy             # local CORS proxy on :8787 for web
npm run web
npm run data:build        # regenerate bundled party/history/municipality data
npm run typecheck
npm run lint
npx expo export --platform web
```

If the shell has not loaded nvm, prefix with the installed Node bin directory
(this machine: `~/.nvm/versions/node/v26.13.0/bin`).

## Architecture

```text
src/
  api/iec.ts                 endpoints, proxy URL, conditional GET, errors
  app/
    _layout.tsx              providers + root stack
    +not-found.tsx
    (tabs)/_layout.tsx       four JS tabs
    (tabs)/index.tsx         national overview
    (tabs)/areas.tsx         provinces + municipalities browser
    (tabs)/parties.tsx       national party ranking
    (tabs)/settings.tsx      refresh/theme/cache/about
    province/[id].tsx        province summary + municipalities
    municipality/[id].tsx    summary + opt-in ward detail
    party/[id].tsx           current support, history, provinces, councils led
  components/ui/             Screen, headers, cards, rows, badges, states, chart
  context/
    settings.tsx             persisted refresh interval + theme preference
    results.tsx              national polling, cache hydration, backoff
  data/parties.ts            generated party metadata
  data/history.ts            generated compact history tuples
  data/municipalities.ts     generated 213-municipality reference list
  hooks/useNow.ts            re-render for relative timestamps
  hooks/useMunicipalityDetail.ts   single-slot opt-in ward download
  lib/derive.ts              sorting, leaders, council status, history lookups
  lib/format.ts              numbers, percentages, SA clock time, relative time
  lib/parties.ts             party index, colours, IND/OTHER handling
  lib/storage.ts             AsyncStorage keys, compact cache helpers
  theme/index.tsx            palette + spacing/radius/type tokens
  types/iec.ts               IEC feed models
scripts/
  build-static-data.mjs      regenerates src/data/*
  iec-proxy.mjs              local web CORS/conditional proxy
```

## Data source — verified live

Base: `https://results.elections.org.za/dashboards/lge`

Files are plain JSON with a `.js` extension:

```text
National:        MapsJason/2026/EEID1887LiteMapsNational.js
Municipality:    MapsJason/2026/EEID1887Munic<MunicipalityID>.js  (up to ~17–20 MB)
Party list:      MapsJason/2016/PartyList.js                      (~471 KB)
History:         MapsJason/HistoryYears/HistoryYearsNational.js   (~1.4 MB)
Party image:     Party_Images/<PartyImage>
Dashboard:       https://results.elections.org.za/dashboards/lge/LGEResultsDashboard.aspx
```

The national Lite file already contains every province and municipality summary,
so one polling feed powers the overview, province and municipality screens. Do
not fetch per-province files.

### The live feed is sparse — this matters for counts

The 2026 feed is **not** a complete candidate list. It contains only areas and
parties that already have at least one counted result:

- All 9 provinces are always present.
- **Municipalities only appear once they have counted votes.** On 5 Nov 2026 at
  ~02:42 the feed had 134 of the expected 213 municipalities (Gauteng 7 of 9,
  KZN 14 of 44, Limpopo 3 of 22, …).
- **Parties only appear once they have a vote somewhere.** At the same time 14
  parties were present nationally; by 02:49 that had grown and the bundled
  metadata was regenerated for 18 parties.
- `WardResults` is always empty in the national file. Ward and voting-district
  detail exists only in the per-municipality files.
- `MuncipalitiesComplete` counts municipalities that are **fully counted**
  (100%), not municipalities that have started reporting. It stays at 0 for a
  long time. Use `MunicipalityResults.length` for "reporting".

To show the full picture, `src/data/municipalities.ts` bundles all 213
municipalities from the completed 2021 feed (`EEID1091LiteMapsNational.js`).
Results from the live feed override the reference entries; municipalities with
no live entry render as "No results yet". Regenerate that file with
`npm run data:build`.

### Important shape notes

- `NationalResult.ProvinceResults[]` contains `MunicipalityResults[]`.
- Each national/province/municipality object has `PartyBallotResults[]` plus
  progress fields. The national Lite file therefore powers all summary screens.
- Ward data is only in the per-municipality file; `WardResults` in the national
  Lite file is empty. Municipality files contain `WardResults[]`, and each ward
  has `VotingDistrictResults[]`.
- Progress field typo from IEC: **`MuncipalitiesComplete`** (one "i").
- "Votes counted" on the dashboard = **`Perc_VDsComplete`**.
- Special party IDs: **`0` = Independent**, **`-2` = Other**.
- `PartyList.js` has 2,336 entries across all elections; the 2026 feed exposes a
  growing subset. Prefer the entry with full name + image + colour.
- History rows: `{ lYear, lPartyId, iPercentageSupport, lProvinceId?,
  lMunicipalityId? }`; national history covers 2000–2021, excluding 2026.
- Report dates are ISO strings with `+02:00`; show SA time directly.
- The national feed grows as counting progresses because `PartyBallotResults`
  gains parties and vote fields. The compact cache strips empty ward arrays.

### CORS and the proxy

The IEC host sends no `Access-Control-Allow-Origin`, so native fetch works but a
browser does not. `src/api/iec.ts` routes through `EXPO_PUBLIC_IEC_PROXY` when set
and defaults to `http://localhost:8787/proxy` on web in development.

`scripts/iec-proxy.mjs`:

- Only forwards `https://results.elections.org.za/...`
- Handles `GET`, `HEAD`, `OPTIONS`
- Forwards `If-None-Match` / `If-Modified-Since`
- Exposes `ETag` / `Last-Modified` / `Content-Length`
- Streams large bodies so 17 MB ward files do not buffer in memory

## Runtime behaviour

- On boot, hydrate the compact national snapshot from AsyncStorage, then check
  the feed using the saved validators. A 304 updates the "checked" time without
  replacing data or re-downloading the body.
- Poll only while the app is active. Foreground return refreshes only if the last
  check is older than 15 s, and never in manual-only mode.
- On failure, keep showing cached data with a warning and back off up to 5 min.
- Party metadata and history come from bundled files, not the network.
- Ward detail downloads only after an explicit tap, aborts if the route changes,
  and keeps just one municipality in memory.

## Key decisions

- One polling feed powers national/province/municipality summaries.
- Ward detail is opt-in because the file is large and expensive to parse.
- Bundle static party/history reference data instead of downloading it.
- Cache a compact national snapshot, not raw municipality files.
- Native talks directly to IEC; web uses the local proxy.
- No external UI/data libraries beyond the installed Expo/React Native set.
- Expo Router file-based routes per `AGENTS.md`.
