# WeatherBoard

A personal weather dashboard that installs like an app and works offline. Search any city worldwide, see current
conditions and a five-day forecast, keep up to five favourite cities one tap away, and get a daily morning reminder.

Built for the Edspire Frontend (React) Developer Technical Challenge. Client-side only — no backend.

**Live application:** _not deployed yet — see [Deployment](#deployment). Add the URL here once it is live._

---

## Contents

1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [Architecture](#architecture)
4. [Project structure](#project-structure)
5. [Getting started](#getting-started)
6. [Environment variables](#environment-variables)
7. [API integrations & fallback strategy](#api-integrations--fallback-strategy)
8. [PWA & offline strategy](#pwa--offline-strategy)
9. [Daily reminders (notifications)](#daily-reminders-notifications)
10. [Validation, errors and accessibility](#validation-errors-and-accessibility)
11. [Testing](#testing)
12. [Known limitations](#known-limitations)
13. [Deployment](#deployment)

---

## Features

| Area | What it does |
| --- | --- |
| **City search** | Live autocomplete (GeoDB Cities) with 250 ms debounce, request cancellation, per-query caching, keyboard navigation (↑ ↓ Enter Esc), click-outside to close, `/` shortcut. A city can only be chosen from real geocoded suggestions. |
| **Current weather** | City, region, country, local date & time (city timezone), temperature, condition icon & description, feels-like, humidity, wind (speed + direction), today’s high/low. |
| **5-day forecast** | Five real **calendar days** in the city’s timezone (not five rolling 3-hour records), with min/max, condition and chance of rain. |
| **Today’s details** | Sunrise, sunset, chance of rain, pressure, visibility, cloud cover — shown only when the provider supplies them. |
| **Favourites** | Up to 5, duplicate-proof, persisted in localStorage with coordinates (no re-search needed), removal behind a confirmation dialog. Falls back to in-memory storage if localStorage is blocked. |
| **Fallback provider** | OpenWeatherMap first; Open-Meteo automatically if it fails (missing key, 401, 429, 5xx, timeout). The UI says which provider answered and why. |
| **PWA** | Valid manifest, 192/512/maskable PNG icons, installable, custom Install button (Chromium), app-shell precache, update prompt. |
| **Offline** | Offline banner, last-viewed city + forecast available offline and clearly labelled as saved data, automatic refresh on reconnect. |
| **Daily reminder** | Explanation-first permission flow, time picker with validation, enable/disable, test notification, honest capability reporting (see [limitations](#daily-reminders-notifications)). |
| **Bonus** | Light/dark theme (system default, persisted, no flash), °C/°F (persisted, no refetch), subtle CSS-animated weather icons that respect `prefers-reduced-motion`. |

## Technology stack

- **React 19 + TypeScript 6** (strict mode, `noUncheckedIndexedAccess`, no `any`)
- **Vite 8** — dev server and build, plus a ~40-line custom plugin that injects the precache manifest into the service worker
- **Plain CSS with design tokens** (custom properties) — one stylesheet per component, light/dark themes from the same tokens, container queries for the forecast layout
- **lucide-react** icons, **Inter** variable font (self-hosted via `@fontsource-variable/inter`, so it works offline)
- **Hand-written service worker** (no Workbox) — small enough to read in one sitting and explain line by line
- **Vitest** for unit tests, **oxlint** for linting
- APIs: OpenWeatherMap, Open-Meteo (forecast + geocoding), GeoDB Cities via RapidAPI, Notifications API, Periodic Background Sync

Why plain CSS instead of Tailwind: the visual identity relies on a small set of semantic tokens shared by two themes.
Keeping them as CSS variables makes theming a single attribute switch (`data-theme`) and keeps component markup readable.

## Architecture

```
┌──────────────────────── components/ (presentational) ────────────────────────┐
│ Header · CitySearch · CurrentWeather · Forecast · FavouriteCities · Reminders │
└───────────────▲───────────────────────────────────────────────▲──────────────┘
                │ props                                         │ callbacks
┌───────────────┴──────────────── hooks/ (state + effects) ─────┴──────────────┐
│ useWeather · useCitySearch · useFavorites · useNotifications · useOnlineStatus│
│ useLocalStorage · usePreferences · useInstallPrompt · useServiceWorker        │
└───────────────▲──────────────────────────────────────────────────────────────┘
                │ typed calls
┌───────────────┴──────────────── services/ (I/O, no React) ───────────────────┐
│ weatherService ──► providers/openWeatherMap ─┐                               │
│                └─► providers/openMeteo ──────┴─► normalised WeatherData      │
│ geoService (GeoDB → Open-Meteo geocoding) · http (fetch, timeout, ApiError)   │
│ storageService (safe localStorage) · weatherCache · dataCache (Cache Storage)│
│ notificationService · serviceWorkerRegistration                               │
└──────────────────────────────────────────────────────────────────────────────┘
                 utils/ — pure functions (dates/timezones, units, forecast
                 aggregation, validation, runtime guards), unit-tested
```

Key decisions:

- **One internal weather model** (`types/weather.ts`). Both providers are normalised into `WeatherData` (always °C and m/s) inside their provider module. Nothing above `services/` knows which API answered except for a display label.
- **Display-only unit conversion.** Data stays metric; `formatTemperature(c, unit)` converts at render. Switching °C/°F never refetches.
- **Timezones without a timezone database.** Both APIs return the city’s UTC offset. Shifting the epoch by that offset and formatting as UTC gives the city’s wall-clock time and calendar date, whatever the viewer’s timezone.
- **Typed errors.** `fetchJson` maps every failure to an `ApiError` with a `kind` (`offline`, `rate-limit`, `unauthorized`, `timeout`, …), so the UI can say *what* failed instead of “Something went wrong”.
- **Cancellation everywhere.** Every request takes an `AbortSignal`. A new search or city selection aborts the previous one, so a slow response can never overwrite a newer one.
- **`useWeather` is a reducer.** States are `restoring → idle | loading → ready | error`, plus `isRefreshing` and `refreshError` so a failed refresh keeps showing the older data (labelled) instead of blanking the screen.
- **No fake data.** Missing metrics are hidden, not invented. The only hard-coded geographic data is six “quick pick” city coordinates on the welcome screen. Weather is always fetched live.

## Project structure

```
public/
  manifest.json            Web App Manifest
  service-worker.js        Service worker (precache list injected at build time)
  favicon.svg
  icons/                   192, 512, maskable-512, apple-touch, notification badge (PNG)
design/icons/              SVG sources for the PNG icons
src/
  App.tsx                  Composition root — wires hooks to components
  main.tsx                 Entry point
  config/                  env.ts (API keys), constants.ts (storage keys, limits)
  types/                   city.ts, weather.ts, forecast.ts, browser.d.ts
  services/
    http.ts                fetchJson + ApiError + abortable sleep
    weatherService.ts      Provider orchestration & fallback
    providers/             openWeatherMap.ts, openMeteo.ts (fetch + validate + normalise)
    geoService.ts          GeoDB autocomplete (+ Open-Meteo geocoding fallback)
    storageService.ts      localStorage that never throws (memory fallback)
    dataCache.ts           JSON in Cache Storage (shared with the service worker)
    weatherCache.ts        Last-viewed weather snapshot
    notificationService.ts Permission, show, periodic sync, reminder content
    serviceWorkerRegistration.ts
  hooks/                   useWeather, useCitySearch, useFavorites, useNotifications, …
  components/              One folder per component, each with its own CSS
  utils/                   dateUtils, weatherUtils, forecastUtils, validation, guards (+ tests)
  styles/global.css        Design tokens, themes, layout, shared primitives
vercel.json                SPA rewrite + service-worker/manifest headers
```

## Getting started

Requirements: **Node.js 20+** (developed with Node 24) and npm.

```bash
npm install
cp .env.example .env.local      # then add your keys (optional — see below)
npm run dev                     # http://localhost:5173
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server with HMR. **The service worker is not registered in dev**, so offline behaviour is not available here. |
| `npm run build` | Type-check (`tsc -b`) and production build into `dist/`, with the service worker manifest injected. |
| `npm run preview` | Serve `dist/` at http://localhost:4173. **Use this to test PWA, offline and notifications.** |
| `npm test` | Unit tests (Vitest). |
| `npm run lint` | oxlint. |
| `npm run typecheck` | TypeScript only. |

Service workers need a secure context: `localhost` counts as secure, and production needs HTTPS (Vercel and Netlify provide it).

## Environment variables

Create `.env.local` (git-ignored) from `.env.example`:

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_OPENWEATHER_API_KEY` | Recommended | OpenWeatherMap key ([get one](https://home.openweathermap.org/api_keys)). New keys can take up to ~2 hours to activate. |
| `VITE_RAPIDAPI_KEY` | Recommended | RapidAPI key subscribed to [GeoDB Cities](https://rapidapi.com/wirefreethought/api/geodb-cities) (free BASIC plan). |
| `VITE_RAPIDAPI_HOST` | Optional | Defaults to `wft-geo-db.p.rapidapi.com`. |

The app still works with **no keys at all**, using the keyless Open-Meteo services, and says so in the UI. That is the
same fallback path that runs when the primary APIs fail.

> **Security note.** `VITE_*` variables are compiled into the JavaScript bundle, so anyone using the deployed site can
> read them. A client-only app cannot hide an API key. Mitigations: use free-tier keys, never commit `.env.local`, and
> rotate keys if they are abused. Hiding keys properly needs a server-side proxy, which the challenge rules out.

## API integrations & fallback strategy

### Weather — OpenWeatherMap (primary)

- `GET /data/2.5/weather` — current conditions
- `GET /data/2.5/forecast` — 5 days × 3-hour slots (40 items)

Both endpoints are on the free plan. One Call 3.0 would return a daily forecast directly, but it needs a separate
subscription, so it is deliberately not used. The two requests run in parallel with `units=metric`.

**Forecast aggregation** (`utils/forecastUtils.ts`): the 40 rolling slots are grouped by **calendar date in the city’s
timezone**. Today’s group also includes the current observation. Min/max come from the whole day, and the condition
comes from the slot closest to local noon. The first five dates are returned: today plus four full days. Unit tests
cover timezone boundaries, min/max, the noon representative and precipitation probability.

### Weather — Open-Meteo (fallback)

`GET https://api.open-meteo.com/v1/forecast` with `current=…`, `daily=…`, `timezone=auto`, `forecast_days=5` and
`timeformat=unixtime`. It is free, keyless and CORS-enabled. Open-Meteo already returns daily buckets in the city’s
timezone, and WMO weather codes are mapped to the same condition set as OpenWeatherMap’s ids.

### Fallback rules (`services/weatherService.ts`)

| OpenWeatherMap result | Behaviour |
| --- | --- |
| Success | Show it (“Live · OpenWeatherMap”). |
| No key, 401/403, 429, 5xx, timeout, network error, malformed response | Try Open-Meteo. If that succeeds, show it with a notice explaining why, e.g. “OpenWeatherMap’s rate limit was reached. This forecast comes from Open-Meteo instead.” |
| Device offline | Don’t try a second network call. Show the saved snapshot for that city (labelled as saved data), or an offline message. |
| Request cancelled (user picked another city) | Ignored. Never treated as a failure and never triggers the fallback. |
| Both providers fail | A specific error (“Both weather services failed: OpenWeatherMap … Open-Meteo …”) with Retry. If a snapshot for that city exists, it is shown with a “Couldn’t refresh” warning instead. |

Saved data is never shown as live: it carries a **“Saved data”** pill and an “updated N h ago” label.

### City search — GeoDB Cities via RapidAPI

`GET https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=…&types=CITY&sort=-population&limit=8`

The free plan allows **1 request per second**, so `geoService.ts`:

1. **debounces** input for 250 ms and skips the network for invalid input (< 2 characters, digits or symbols);
2. **cancels** stale requests with `AbortController`;
3. **caches** results per query (50 entries), so backspacing to a previous query is instant;
4. **spaces** requests at least 1.1 s apart;
5. **retries a 429 once** after `Retry-After`;
6. then **falls back to Open-Meteo Geocoding** (keyless), with a small note under the suggestions.

Suggestions show the city, region/state, country and a country-code badge.

## PWA & offline strategy

### Manifest & icons
`public/manifest.json` contains `name`, `short_name`, `description`, `id`, `start_url`, `scope`,
`display: standalone`, `theme_color` and `background_color`. Icons are 192×192 and 512×512 PNG (`purpose: any`) plus
a 512×512 maskable icon with its content inside the safe zone. The PNGs were rendered from the SVG sources in
`design/icons/` and checked to be real images of the stated size.

### Service worker (`public/service-worker.js`)

| Cache | Contents | Lifetime |
| --- | --- | --- |
| `weatherboard-shell-<version>` | `/`, all hashed JS/CSS/font assets and public files, precached on `install` | Replaced when a new build ships. `activate` deletes old versions. |
| `weatherboard-data-v1` | `last-weather.json` (last-viewed city + normalised weather) and `reminder.json` | Survives app updates. Written by the page, read by the worker. |

- **Versioning:** the Vite plugin in `vite.config.ts` writes the build’s file list and a content hash into the worker. Any asset change gives a byte-different worker, so the browser installs the new version and old shell caches are deleted.
- **Navigations:** network-first with a 4 s timeout, falling back to the cached shell (or a minimal offline page if the shell isn’t cached yet).
- **Static assets:** cache-first. Hashed file names are immutable.
- **Third-party API calls are not intercepted.** The app handles failures itself and falls back to the snapshot, which is labelled honestly. Caching raw API responses would also store the API key inside cache keys.
- **Updates:** a new worker waits instead of calling `skipWaiting` automatically. The app shows “A new version is ready → Reload”, so a page never runs against assets from a different build.

### Offline behaviour
- An **offline banner** appears as soon as `navigator.onLine` turns false. It shows how old the on-screen data is.
- The **last-viewed city and its forecast** load from Cache Storage, with localStorage as a mirror, even after a full reload while offline. They are labelled “Saved data · may be out of date”.
- Choosing an un-cached city offline gives a clear offline message, never fabricated data.
- **On reconnect:** “You’re back online — refreshing…”, weather refetches automatically, the snapshot is updated, and the banner disappears.
- Data older than 15 minutes also refreshes automatically when the tab becomes visible again.

## Daily reminders (notifications)

### Permission flow
1. The **Morning reminder** card explains the benefit: one notification each morning with today’s temperature, conditions and high/low for your city.
2. The user picks a time (validated on blur; `HH:MM`, device timezone).
3. The browser permission prompt appears **only** after the user clicks **Turn on daily reminder**. Nothing is requested on page load.
4. Every outcome is handled: **granted** (reminders on), **denied** (instructions for unblocking it in site settings), **dismissed** (reminders stay off, with an explanation), **unsupported** (message, including the iOS Home Screen requirement), and permission **revoked later** (detected through the Permissions API or on `visibilitychange`).
5. **Send test** shows a real notification with live weather. **Turn off** disables the reminder and unregisters background sync.

### How a reminder can fire — the honest version

The challenge asks for a reminder that fires even when the tab is closed, without a backend. Here is what browsers
actually allow:

| Mechanism | Works with tab closed? | Exact time? | Support | Used? |
| --- | --- | --- | --- | --- |
| `setTimeout`/`setInterval` in the page | ❌ | ✅ | All | ✅ only while a WeatherBoard tab is open (even in the background); checks every 30 s |
| **Periodic Background Sync** | ✅ (installed PWA) | ❌ browser decides, roughly ≥ 12 h apart, based on site engagement | Chrome/Edge desktop & Android, installed apps only | ✅ registered when permitted |
| Notification Triggers (`showTrigger`) | Would have | ✅ | **Never shipped**; Chrome origin trial ended | ❌ |
| **Web Push** (Push API + VAPID) | ✅ | ✅ | All modern browsers | ❌ needs a server to send the push at 07:30, which the challenge rules out |

What WeatherBoard does:

1. **In-page scheduler** (`useNotifications`): while any WeatherBoard tab is open, a 30 s check fires the reminder at the chosen time. It fetches fresh weather, falls back to the saved snapshot (and says how old it is), and shows the notification through `ServiceWorkerRegistration.showNotification`. That call is required on Android, where `new Notification()` throws.
2. **Periodic Background Sync** (`public/service-worker.js`): when the app is installed in Chrome or Edge, the worker is woken roughly once a day. If it is within 4 hours after the chosen time and no reminder has been shown today, it fetches a fresh forecast from keyless Open-Meteo (so the worker never needs the OpenWeatherMap key) and shows the notification. Clicking it focuses or opens the app.
3. **De-duplication:** both paths record `lastShownDate` in shared Cache Storage, so you never get two reminders on the same day.
4. **The UI tells users which delivery paths are active on their browser.** It never claims guaranteed background delivery.

**Bottom line:** exact-time delivery with the browser closed on every browser is not achievable client-side. The
next step would be a tiny push sender, for example a scheduled serverless function holding a VAPID key and the
stored `PushSubscription` objects. The rest of the reminder pipeline (permission, settings, worker, content) is
already in place for that.

## Validation, errors and accessibility

- **City search:** validated on blur (once the user has typed) and on Enter. Errors cover empty input, < 2 characters, invalid characters (all scripts allowed, e.g. São Paulo, 東京, Xi'an) and no results. Errors clear as the input becomes valid. The field uses `aria-invalid` and `aria-describedby`.
- **Reminder time:** validated on blur and on submit (required, valid `HH:MM`).
- **Network and API errors** are specific, e.g. “Couldn’t reach the city search service”, “GeoDB’s rate limit was reached”, “Both weather services failed: …”. `alert()` is never used.
- **ARIA combobox pattern** for search (`role=combobox/listbox/option`, `aria-activedescendant`, live result count). The confirmation dialog uses native `<dialog>` (focus trap, Esc; Cancel is focused first). Toasts use a polite live region. Sections use semantic landmarks and headings.
- **Touch targets** are ≥ 44×44 px on small and touch screens (verified automatically at 375 px). Input font size is 16 px on mobile to prevent iOS zoom.
- **`prefers-reduced-motion`** disables icon animations and transitions.

## Testing

**Unit tests** (`npm test`, 27 tests): forecast aggregation (calendar days, timezone offsets, min/max, noon
representative, precipitation), both provider normalisers (an OpenWeatherMap fixture and a real captured Open-Meteo
response, including missing-value handling), unit conversion, condition mapping, validation, and storageService
fallbacks (blocked storage, quota exceeded, corrupted data).

**End-to-end verification:** the production build (`vite preview`) was driven with headless Microsoft Edge
(playwright-core) at 1280, 768 and 375 px — **82/82 checks passed**. The checks covered:

- search validation, debouncing (6 keystrokes → 1 request), keyboard selection, Escape and click-outside, no results, network failure;
- real weather rendering, five distinct calendar days, loading skeleton, fallback notice, API failure → error → retry;
- °C/°F switching without a refetch, and preferences that persist;
- favourites: add, persist across reloads, 5-city limit, duplicate prevention, confirmation (cancel, Esc, confirm), and a blocked-localStorage mode;
- the manifest fields, PNG icon sizes, an active service worker, the precached shell and the cached snapshot;
- going offline: banner, reload while offline, cached city and forecast, labelling, un-cached city message, reconnect and auto-refresh;
- notifications: explanation, time validation, enable and disable, a test notification with real weather, and the denied, dismissed and unsupported paths;
- layout: no horizontal scroll and no overlapping cards at all three widths, 44 px touch targets, the dropdown fitting the viewport, and no console errors.

The test harness lives outside the repository so it doesn’t add dependencies. The scenarios above are the checklist
used.

## Known limitations

- **Background reminders** — see the table above. Exact-time delivery with the browser closed needs Web Push and a server.
- **API keys are public** in any client-only build (see the security note).
- **GeoDB free plan is 1 request/second.** Very fast searching may briefly use the Open-Meteo geocoding fallback (with a note in the UI).
- **Suggestion latency:** the app adds 250 ms of debounce. The rest is network round-trip, measured at about 0.6–1.3 s from the development machine.
- **Only one offline city:** the snapshot holds the last-viewed city by design. Other favourites need a connection.
- **Today’s min/max from OpenWeatherMap** reflects the remaining hours of today plus the current reading. The free `/forecast` endpoint doesn’t include earlier hours. Open-Meteo gives full-day values.
- **Install button** appears only in Chromium browsers (`beforeinstallprompt`). Safari users install via Share → Add to Home Screen.
- Reminder time uses the **device’s** timezone, not the city’s.

## Deployment

### Vercel (configured — `vercel.json`)

1. Push the repository to GitHub. `.env.local` is git-ignored; check that no keys are committed.
2. On [vercel.com](https://vercel.com) choose **Add New → Project** and import the repo. The Vite preset is detected (build `npm run build`, output `dist`).
3. Under **Settings → Environment Variables**, add `VITE_OPENWEATHER_API_KEY`, `VITE_RAPIDAPI_KEY` and `VITE_RAPIDAPI_HOST` for Production (and Preview). Vite embeds them at build time, so **redeploy after changing them**.
4. Deploy. `vercel.json` provides:
   - SPA fallback (`/(.*) → /index.html`; real files are served first);
   - `Cache-Control: no-cache` on `/service-worker.js`, so updates are picked up immediately;
   - the correct `Content-Type` for `/manifest.json`;
   - long-lived immutable caching for hashed `/assets/*`.
5. Verify on the HTTPS URL: DevTools → Application → Manifest (installable, no errors) and Service Workers (activated). Then run Lighthouse’s PWA checks, and add the URL to the top of this README.

CLI alternative: `npm i -g vercel && vercel --prod` (set the env vars first with `vercel env add`).

### Netlify (alternative)

Build command `npm run build`, publish directory `dist`, the same three env vars, and an SPA redirect
(`/* /index.html 200`) in `public/_redirects`.
