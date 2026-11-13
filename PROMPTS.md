# PROMPTS.md — AI usage log

This file records how AI was used to build WeatherBoard: the real prompts in chronological order, the decisions that
came out of them, and the places where AI-generated output had to be corrected.

## Tools

| | |
| --- | --- |
| **IDE** | Visual Studio Code (Windows 11) |
| **AI assistant** | Claude Code (VS Code extension), model Claude Opus 5.5 |
| **How it was used** | Agentic mode: the assistant inspected the workspace, ran shell commands, wrote code, ran the type checker, linter, unit tests and production build, and drove the built app in headless Microsoft Edge to verify behaviour. |

---

## Prompt history (chronological)

### Prompt 1 — Initial master prompt

Pasted at the start of the session, verbatim:

<details>
<summary>Show the full master prompt</summary>

```text
# ROLE: SENIOR FRONTEND ENGINEER & SOFTWARE ARCHITECT

You are an expert Senior React Engineer, Frontend Architect, UI/UX Engineer, and PWA specialist.

Your task is to develop a production-quality application called **WeatherBoard**, following the Edspire Frontend (React) Developer Technical Challenge specification EXACTLY.

This is a technical hiring assessment. The application will be reviewed by experienced engineers. They will evaluate:

- Frontend engineering skills.
- React architecture and code quality.
- API integration.
- State management.
- Form validation.
- Error handling.
- PWA implementation.
- Service workers and offline support.
- Push notifications.
- Responsive UI.
- Product thinking and attention to detail.
- How effectively AI was used during development.

**IMPORTANT: This is not a tutorial project. Build a polished, complete, functional consumer application.**

Do not skip requirements, replace real functionality with mock functionality, or claim something works when it does not.

---

# 1. FIRST: UNDERSTAND THE REQUIREMENTS

Before writing code:

1. Inspect the existing project directory.
2. Understand the existing framework, dependencies, and configuration.
3. Identify whether this is a new project or an existing project.
4. Preserve useful existing configurations and files.
5. Create a clear implementation plan.
6. Identify all required APIs, environment variables, browser capabilities, and limitations.

If the project is empty, initialize it using:

- React
- TypeScript
- Vite
- Modern CSS or Tailwind CSS
- Lucide React for icons where appropriate

Use clean, maintainable, production-quality code.

Do not unnecessarily overengineer the application.

# 2. PRODUCT REQUIREMENTS

Build a responsive, installable weather dashboard called:

**WeatherBoard**

Product description:

A personal weather dashboard where users can:

- Search for any city worldwide.
- View current weather conditions.
- View a 5-day weather forecast.
- Save up to 5 favourite cities.
- Quickly switch between favourite cities.
- Configure daily morning weather reminders.
- Install the application as a PWA.
- Access the last viewed city's cached weather while offline.

The application must be client-side only. Do not build a backend.

# 3. TECHNICAL STACK

Use:

- React
- TypeScript
- Vite
- Tailwind CSS or well-structured CSS
- Lucide React
- Browser LocalStorage
- Service Worker
- Web App Manifest
- OpenWeatherMap API
- Open-Meteo API
- GeoDB Cities API through RapidAPI
- Browser Notifications API
- Web Push capabilities where technically supported

Use modular architecture.

Suggested structure:

src/
  components/
    Header/
    Search/
    WeatherCard/
    Forecast/
    FavouriteCities/
    NotificationSettings/
    Loading/
    Error/
    OfflineBanner/
    ThemeToggle/
    UnitToggle/

  hooks/
    useWeather.ts
    useCitySearch.ts
    useFavorites.ts
    useNotifications.ts
    useOnlineStatus.ts
    useLocalStorage.ts

  services/
    weatherService.ts
    geoService.ts
    notificationService.ts
    storageService.ts

  types/
    weather.ts
    city.ts
    forecast.ts

  utils/
    weatherUtils.ts
    dateUtils.ts
    validation.ts

  styles/

  App.tsx
  main.tsx

public/
  icons/
  manifest.json
  service-worker.js

You may improve this structure if there is a good architectural reason.

# 4. API INTEGRATIONS

## A. OpenWeatherMap

Use OpenWeatherMap for:

- Current weather.
- Temperature.
- Feels-like temperature.
- Humidity.
- Wind speed.
- Weather condition.
- Weather description.
- Weather icon.
- Five-day forecast.

Use the appropriate free-tier endpoints available to the configured account.

Do not assume that the free API key provides every premium endpoint.

Verify endpoint availability and response formats before implementation.

Use actual API responses. Never hardcode weather data.

Create a dedicated weather service layer.

## B. Open-Meteo

Implement Open-Meteo as the fallback weather provider.

Requirements:

- If OpenWeatherMap fails because of rate limits or an API failure, attempt Open-Meteo.
- Normalize both providers into a common internal TypeScript weather model.
- Ensure the UI does not depend directly on provider-specific response formats.
- Clearly communicate which provider supplied the data if useful.
- Do not silently display fabricated or stale data as live weather.

Open-Meteo must provide actual current weather and a five-day forecast.

## C. GeoDB Cities API via RapidAPI

Integrate GeoDB Cities API for live city autocomplete.

Requirements:

- Search cities as the user types.
- Debounce requests.
- Trigger autocomplete after a reasonable minimum character count.
- Suggestions must appear within 300 ms after the user stops typing, subject to API/network latency.
- Cancel outdated requests using AbortController where supported.
- Avoid unnecessary API requests.
- Show city name, region/state, and country.
- Handle empty results.
- Handle API errors.
- Handle rate limiting.
- Prevent selecting an invalid or incomplete city.

Store API credentials in environment variables.

Never commit API keys.

Create an `.env.example` file.

Example configuration:

VITE_OPENWEATHER_API_KEY=
VITE_RAPIDAPI_KEY=
VITE_RAPIDAPI_HOST=

Document all required credentials.

# 5. CITY SEARCH AND AUTOCOMPLETE

Implement a polished search experience.

Expected behavior:

1. User enters a city name.
2. Client-side validation runs on blur.
3. Debounced GeoDB request fetches suggestions.
4. Suggestions appear in a dropdown.
5. Each suggestion clearly identifies its city, region, and country.
6. User selects a city.
7. Weather loading state appears.
8. Fetch current weather and five-day forecast.
9. Update the dashboard.

Validation requirements:

- Empty city field must produce a clear inline error.
- Invalid city must be handled.
- No search results must produce a useful message.
- Network failures must explain what failed.
- API failures must be handled.
- Do not show generic errors such as "Something went wrong."

Use accessible keyboard navigation:

- Arrow Up/Down.
- Enter to select.
- Escape to close suggestions.

Clicking outside the dropdown should close it.

Ensure dropdown positioning works on mobile and desktop.

# 6. WEATHER DASHBOARD

Design a polished weather dashboard.

The dashboard should contain:

## Header

- WeatherBoard logo/name.
- City search.
- Theme toggle.
- Celsius/Fahrenheit toggle.
- PWA install action when installation is available.

## Main weather section

Display:

- Selected city.
- Country.
- Current date and local time where available.
- Large current temperature.
- Weather condition icon.
- Weather description.
- Feels-like temperature.
- Humidity.
- Wind speed.
- Sunrise and sunset when available.

## Five-day forecast

Display five days of actual forecast data.

Each forecast item should include:

- Day/date.
- Weather icon.
- Condition.
- Minimum temperature.
- Maximum temperature.

Make sure the forecast represents five calendar days and does not accidentally display five consecutive API records from the same day.

Use proper timezone handling.

## Additional weather information

Where data is available, display useful weather metrics in a visually consistent manner.

Avoid clutter.

Every section should have clear visual hierarchy.

# 7. FAVOURITE CITIES

Implement favourite city functionality.

Requirements:

- Maximum five favourite cities.
- Add current city to favourites.
- Remove favourite city.
- Persist favourites using localStorage.
- Restore favourites after page refresh.
- Favourite cities should be quickly accessible.
- Clicking a favourite loads its weather.
- Prevent duplicate favourites.
- Prevent adding a sixth favourite.
- Display a clear message when the limit is reached.
- Removing a favourite requires explicit confirmation.

Handle localStorage failures gracefully.

If localStorage is unavailable, the application must continue functioning in memory without crashing.

Store sufficient city identification data, including coordinates, so that selecting a favourite does not require searching for that city again.

# 8. PROGRESSIVE WEB APPLICATION

Implement a proper PWA.

This is a mandatory requirement.

## Web App Manifest

Create a valid manifest containing:

- name: WeatherBoard
- short_name: WeatherBoard
- description
- start_url
- scope
- display: standalone
- theme_color
- background_color
- icons

Provide valid 192x192 and 512x512 PNG icons.

Do not use empty or invalid icon placeholders.

## Service Worker

Implement a service worker that:

- Caches the application shell.
- Caches necessary static assets.
- Supports offline application loading.
- Caches the last-viewed city's weather.
- Updates cached weather when new successful weather data is retrieved.
- Handles cache versioning.
- Removes obsolete caches during activation.
- Handles failed network requests gracefully.

## Offline behavior

When the user goes offline:

- Display a clearly visible offline banner.
- Load the last cached weather data.
- Allow users to view the last cached city and forecast.
- Clearly identify cached information as potentially outdated.
- Do not pretend cached data is live.
- Keep the rest of the application usable where possible.

When connectivity returns:

- Remove the offline banner.
- Refresh weather data where appropriate.
- Update the cached data.

Test actual offline behavior, not just the appearance of an offline banner.

# 9. PUSH NOTIFICATIONS

Implement the daily morning weather reminder.

This requirement is important.

Users should be able to:

- Enable daily weather reminders.
- Select their preferred reminder time.
- Disable reminders.
- Understand why notifications are requested.

## Permission flow

Before requesting browser notification permission:

1. Explain the benefit of enabling notifications.
2. Explain that the application will provide a daily weather reminder.
3. Ask the user to explicitly enable reminders.
4. Only then request browser permission.

Never request notification permission immediately on page load.

Handle:

- Permission granted.
- Permission denied.
- Permission dismissed/default.
- Browser does not support notifications.
- Service worker unavailable.
- Notification subscription unavailable.

A denied notification permission must not break the dashboard.

## Critical technical requirement

The challenge explicitly requires a reminder that fires even when the tab is closed.

Do not implement a misleading setInterval-based solution and claim that it works when the browser is closed.

Investigate the actual browser capabilities.

A service worker's periodic background execution is not guaranteed across browsers.

True scheduled Web Push generally requires a push subscription and a server-side scheduler/push sender.

Because this challenge prohibits writing a backend, investigate whether a standards-compliant, browser-supported solution is possible within the client-only constraint.

Implement the strongest genuinely supported solution.

If true daily background scheduling cannot be guaranteed without a backend:

- Clearly document the limitation.
- Provide a working fallback where supported.
- Do not misrepresent local notifications as guaranteed background Web Push.
- Keep notification settings functional.
- Explain the limitation in README.md.

Use graceful capability detection.

Do not allow unsupported notification features to crash the application.

# 10. FORM VALIDATION

All submittable inputs must have client-side validation.

Validate on blur, not only on submit.

Provide:

- Inline error messages.
- Clear field states.
- Accessible error descriptions.
- Error clearing when users correct their input.

Validate the city search and notification settings.

Handle:

- Empty city field.
- Invalid input.
- No city search results.
- Network failure.
- Invalid notification time.
- Unsupported browser features.

Never use alert() for ordinary validation.

Use polished inline feedback.

# 11. RESPONSIVE DESIGN

The application must work correctly at:

- 375px mobile.
- 768px tablet.
- 1280px desktop.

Requirements:

- No horizontal scrolling.
- No overlapping cards.
- No clipped content.
- Readable typography.
- Proper spacing.
- Responsive forecast layout.
- Responsive favourite city panel.
- Touch targets of at least 44x44px on mobile.
- Search dropdown must fit the viewport.
- Notification settings must work on mobile.

Test all three viewport sizes.

Do not just make the desktop layout shrink.

Design a proper mobile experience.

# 12. UI/UX DESIGN DIRECTION

The application must feel like a polished SaaS/consumer product.

Study these design references:

- Linear: clean layout, excellent empty states, typography hierarchy.
- Vercel Dashboard: status indicators, subtle motion, information density.
- Stripe: error handling and inline validation.
- Mercury: dashboard cards, data hierarchy, calm colour palette.
- Dribbble Weather Dashboard: weather card and forecast patterns.
- Mobbin: real mobile search, notification, and settings patterns.

Do not copy these websites.

Create an original WeatherBoard visual identity.

Design expectations:

- Clean and modern.
- Excellent typography.
- Consistent spacing.
- Subtle shadows.
- Refined card borders.
- Consistent border radius.
- Smooth but restrained transitions.
- Attractive weather icons.
- Excellent empty states.
- Loading skeletons.
- Friendly error states.
- Clear success feedback.

Avoid:

- Generic AI-generated dashboard appearance.
- Excessive gradients.
- Excessive glassmorphism.
- Unnecessary decorative elements.
- Oversized cards.
- Excessive animations.
- Clutter.

The product should look like something a real company would ship.

# 13. OPTIONAL BONUS FEATURES

Implement these after all mandatory requirements are complete.

## Dark/Light mode

- Toggle dark and light mode.
- Detect system preference initially.
- Persist user preference.
- Ensure all components support both themes.

## Celsius/Fahrenheit

- Add a °C/°F switch.
- Persist the selection.
- Update all temperatures without a page reload.
- Ensure min/max forecast values also update correctly.

Use proper conversion:

F = (C × 9/5) + 32

Do not refetch weather simply to change temperature units.

## Animated weather icons

Use CSS or Lottie animations where appropriate.

Animations must be subtle and must not affect performance.

# 14. CODE QUALITY REQUIREMENTS

Follow these rules:

- Use TypeScript strict mode.
- Avoid `any`.
- Create reusable components.
- Separate API logic from UI.
- Keep business logic outside presentation components.
- Use proper types for API responses.
- Handle rejected promises.
- Handle loading, success, empty, and error states.
- Avoid memory leaks.
- Clean up event listeners.
- Clean up timers.
- Cancel outdated requests.
- Avoid unnecessary re-renders.
- Avoid duplicated code.
- Use semantic HTML.
- Follow accessibility best practices.
- Ensure React keys are stable.
- Avoid unnecessary dependencies.

Do not put the entire application in App.tsx.

Do not write fake functionality just to make the interface look complete.

# 15. TESTING AND VERIFICATION

After implementation, verify every requirement.

Create a checklist and test the following.

## Search

- [ ] Search for a valid city.
- [ ] Autocomplete appears.
- [ ] Debouncing works.
- [ ] Empty input validation works.
- [ ] No results state works.
- [ ] API error state works.
- [ ] Keyboard navigation works.
- [ ] Selecting a city loads its weather.

## Weather

- [ ] Real OpenWeatherMap data.
- [ ] Open-Meteo fallback.
- [ ] Current temperature.
- [ ] Humidity.
- [ ] Wind speed.
- [ ] Condition icon.
- [ ] Five-day forecast.
- [ ] Loading state.
- [ ] API error state.

## Favourites

- [ ] Add a favourite.
- [ ] Maximum five enforced.
- [ ] Duplicate prevented.
- [ ] Favourite persists after reload.
- [ ] Favourite selection loads correct weather.
- [ ] Removal requires confirmation.
- [ ] localStorage failure does not crash application.

## PWA

- [ ] Valid manifest.
- [ ] 192px icon.
- [ ] 512px icon.
- [ ] Service worker registered.
- [ ] Application shell cached.
- [ ] Last-viewed weather cached.
- [ ] Offline banner.
- [ ] Cached city accessible offline.
- [ ] Reconnection works.

## Notifications

- [ ] Permission explanation.
- [ ] Explicit permission request.
- [ ] Notification settings.
- [ ] Reminder time selection.
- [ ] Enable and disable.
- [ ] Denied permission handling.
- [ ] Unsupported browser fallback.
- [ ] Honest documentation of background scheduling limitations.

## Responsive

- [ ] 375px.
- [ ] 768px.
- [ ] 1280px.
- [ ] No horizontal scrolling.
- [ ] Minimum touch target size.

## General

- [ ] No TypeScript errors.
- [ ] No build errors.
- [ ] No console errors.
- [ ] No broken images.
- [ ] No broken routes.
- [ ] No exposed API keys.
- [ ] No mocked weather data.

Do not mark an item complete without actually verifying it.

# 16. DOCUMENTATION

Create a professional README.md containing:

1. Project overview.
2. Features.
3. Technology stack.
4. Architecture.
5. Project structure.
6. Installation instructions.
7. Environment variable configuration.
8. API integrations.
9. API fallback strategy.
10. PWA implementation.
11. Offline caching strategy.
12. Notification implementation.
13. Known browser limitations.
14. Known limitations.
15. Local development instructions.
16. Production build instructions.
17. Deployment instructions.
18. Live application URL.

Create `.env.example`.

Add a proper `.gitignore`.

# 17. PROMPTS.MD — MANDATORY

The hiring challenge explicitly requires PROMPTS.md.

Create a PROMPTS.md documenting:

- The IDE used.
- The initial master prompt.
- Follow-up prompts.
- Debugging prompts.
- Architectural decisions.
- Important changes made during development.
- Which AI-generated suggestions were corrected.

Maintain the actual prompt history in chronological order.

Do not fabricate prompt history.

If you are working through Claude Code, preserve the real prompts used during this session as accurately as possible.

# 18. DEPLOYMENT

Prepare the application for public deployment using Vercel or Netlify.

Requirements:

- Production build must succeed.
- PWA assets must be served correctly.
- Service worker must work over HTTPS in production.
- Environment variables must be configured correctly.
- SPA routing must work.
- README must explain deployment.
- Do not expose secrets in GitHub.

Do not claim deployment is complete until a real live deployment URL has been verified.

# 19. DEVELOPMENT WORKFLOW — FOLLOW THIS STRICTLY

Work in the following phases.

PHASE 1 — PROJECT INSPECTION

Inspect the project, dependencies, configuration, and current files.

PHASE 2 — ARCHITECTURE

Create the implementation plan and file structure.

PHASE 3 — DESIGN SYSTEM

Build the application layout, responsive structure, typography, cards, and reusable UI components.

PHASE 4 — CITY SEARCH

Implement GeoDB autocomplete, debouncing, validation, keyboard navigation, and error states.

PHASE 5 — WEATHER INTEGRATION

Implement OpenWeatherMap, Open-Meteo fallback, data normalization, and forecast.

PHASE 6 — FAVOURITES

Implement localStorage persistence, five-city limit, duplicate prevention, and confirmation.

PHASE 7 — PWA

Implement manifest, icons, service worker, application shell caching, and last-viewed weather caching.

PHASE 8 — NOTIFICATIONS

Implement permission flow, settings, scheduling capability detection, and honest fallback behavior.

PHASE 9 — BONUS FEATURES

Implement themes, temperature conversion, and weather animations.

PHASE 10 — TESTING

Run the build, inspect the application, test all features, and fix issues.

PHASE 11 — DOCUMENTATION

Create README.md, PROMPTS.md, and `.env.example`.

PHASE 12 — DEPLOYMENT PREPARATION

Prepare the production build and deployment configuration.

# 20. HOW YOU MUST WORK AS AN AI AGENT

Follow these rules throughout development:

1. Do not stop after creating a plan.
2. Implement actual working code.
3. Do not skip any mandatory feature.
4. Do not replace required functionality with placeholders.
5. Do not assume API integrations work without testing them.
6. Do not silently ignore errors.
7. Do not create unnecessary files.
8. Do not overwrite existing working functionality without a reason.
9. Do not expose secrets.
10. Do not claim something has been tested unless it has.
11. When encountering an API limitation, investigate it and implement a documented fallback.
12. Make reasonable engineering decisions independently.
13. If a genuinely critical decision requires my input, ask one specific question rather than making a risky assumption.
14. Keep the code understandable enough that I can explain it in a technical interview.

IMPORTANT: I need to understand the code you generate because I will be interviewed about this project.

For significant architectural decisions, explain:

- What you implemented.
- Why you implemented it.
- What alternatives were considered.
- Any trade-offs.

Do not overwhelm me with explanations after every small file.

# 21. FINAL ACCEPTANCE CRITERIA

The project is complete only when:

- Every mandatory feature in the original Edspire challenge has been addressed.
- The application is responsive.
- Actual weather APIs are integrated.
- Fallback weather functionality is implemented.
- Favourite cities work and persist.
- PWA installation works.
- Offline cached weather works.
- Notification capabilities are implemented honestly.
- All forms are validated.
- Loading and error states exist.
- Production build succeeds.
- README.md is complete.
- PROMPTS.md exists.
- Deployment configuration is ready.

At the end, provide a final engineering report with:

1. Features implemented.
2. Features tested.
3. Build status.
4. API configuration still required.
5. Any remaining limitations.
6. Files created.
7. Deployment steps.
8. Requirements that could not be fully satisfied and why.

**FINAL INSTRUCTION: Build WeatherBoard as if it were going to be reviewed by a senior engineering panel at a real product company. Prioritize correctness, completeness, UI polish, maintainability, and genuine functionality over speed.**
```

</details>

### Prompt 2 — Follow-up (session stalled)

```text
?
```

**Context:** the assistant's first shell command (listing the folder and running `git status`) never returned and the
session was interrupted. Its retry was interrupted the same way.

### Prompt 3 — Debugging prompt

```text
why stuck?
```

**What the AI found:** the project folder sits inside a parent git repository (`d:\projects`) with thousands of
unrelated pending changes, so `git status` through Git Bash hung. The assistant stopped calling git and switched to
the dedicated file tools and PowerShell. Inspection showed an **empty folder**, so a new Vite + React + TypeScript
project was started.

> Everything after Prompt 3 was done by the agent working through the master prompt's phases without further user
> prompts. If more prompts are used later (for example to add API keys or deploy), append them below in order.

---

## Architectural decisions (and alternatives considered)

| Decision | Why | Alternatives / trade-offs |
| --- | --- | --- |
| **Vite + React 19 + TS strict**, configs taken from the current official `create-vite` `react-ts` template | The installed toolchain (Vite 8, TS 6, ESLint 10) was newer than the AI’s memory, so it generated the official template in a scratch folder and copied its configs instead of guessing. | Hand-writing configs from memory risked outdated options. |
| **Plain CSS + design tokens** instead of Tailwind | Two themes from one token set via `data-theme`; readable markup; no build plugin. | Tailwind is faster to write but adds a dependency and long class strings for a small app. |
| **One normalised `WeatherData` model**, providers isolated in `services/providers/*` | The UI never depends on provider shapes; adding or swapping a provider touches one file. | Rendering provider responses directly would couple every component to OWM’s format. |
| **Forecast grouped by city-local calendar date** with the noon slot as representative | The OWM free `/forecast` is 3-hourly; naive slicing gives rolling 24 h windows or repeated days. | One Call 3.0 has daily data but needs a paid subscription. |
| **UTC-offset timezone math** instead of a tz library | Both APIs return the offset; shifting the epoch and formatting as UTC is exact for “now” and the forecast window. | `date-fns-tz` or Luxon would add weight for no benefit here. |
| **City search fallback to Open-Meteo Geocoding** | GeoDB’s free tier is 1 req/s, so autocomplete must not break when it is rate limited. Combined with debounce, caching, request spacing and one retry. | Showing only an error on 429 would leave search unusable while typing. |
| **Hand-written service worker + 40-line Vite plugin** to inject the precache list and version | Small enough to explain line by line in an interview; the version hash gives cache versioning for free. | `vite-plugin-pwa`/Workbox is more featureful but a black box for an assessment. |
| **Snapshot in Cache Storage (+ localStorage mirror)** rather than caching raw API responses in the SW | The worker can read Cache Storage (needed for background reminders); only the last-viewed city is kept; API keys never end up in cache keys. | Caching third-party responses in the SW would key them by URL (including the API key) and keep every city ever viewed. |
| **Update prompt instead of automatic `skipWaiting`** | Avoids a page running against assets from a different build. | Auto-activation is simpler but can break an open tab mid-session. |
| **Reminders: in-page scheduler + Periodic Background Sync, honestly labelled** | It is the strongest option that genuinely works without a server. Notification Triggers never shipped; Web Push needs a sender. The UI and README state exactly what works where. | A `setInterval`-only version that claimed to work with the browser closed would be misleading, as the master prompt warned. |
| **`useReducer` for weather state** | Many related fields (status, data, source, refresh error) change together; a reducer makes transitions explicit and testable. | Several `useState`s invite inconsistent states. |
| **Native `<dialog>`** for the removal confirmation | Built-in focus trap, Esc, inert background, correct semantics. | A custom modal or library would need all of that reimplemented. |
| **oxlint** (as in the current Vite template) instead of the ESLint plugin stack | One dependency instead of six; includes the React hooks rules. | ESLint has a larger plugin ecosystem, not needed here. |

---

## Important changes & AI suggestions that were corrected

These are real corrections made during this session, found by the AI’s own verification (type checker, linter,
unit tests, headless-browser runs, screenshot review) and then fixed:

1. **ESLint stack → oxlint.** The AI first installed ESLint plus five plugins out of habit. After comparing with the current official template it replaced them with oxlint and removed the extra dependencies.
2. **Stale read after a failed write in `storageService`.** The first version preferred localStorage over the in-memory copy on read. If a write failed (quota exceeded), the next read would return the old persisted value. Fixed by tracking “memory-only” keys; covered by a unit test.
3. **Type-name collision.** The notification service exported a `PermissionStatus` type that shadowed the DOM’s global `PermissionStatus`. The AI renamed it with a regex replace, which also wrongly renamed one legitimate DOM usage; the type checker caught it, and it was fixed by hand.
4. **Lint: `setState` synchronously inside an effect** (`useCitySearch`). The first version set a “loading” state at the start of the effect. It was removed because “pending” is already derived during render from “results belong to a different query”, which also avoids an extra render.
5. **Lint: `useMemo(getCapabilities, [])`.** Replaced with lazy `useState(getCapabilities)`, a clearer way to compute once.
6. **Bug found by the browser test — dropdown wouldn’t reopen after Escape.** The input kept focus, so `onFocus` never fired again. Fixed by also opening on click.
7. **Bug found by the browser test — touch targets under 44 px at 375 px.** The logo link was 30 px tall and the °C/°F options were 38 px. CSS was fixed and re-verified (82/82 checks).
8. **Bug found by screenshot review — search icon overlapping the placeholder.** Cause: `global.css` was imported *after* `App`, so the base `.input` padding overrode the component’s padding (same specificity, later wins). Fixed by importing global styles first in `main.tsx`.
9. **Vercel rewrite simplified.** A regex that excluded asset paths was replaced with `/(.*) → /index.html`, because Vercel serves real files before applying rewrites.
10. **Icon sources moved out of `public/`.** The SVG sources for the PNG icons would otherwise have been precached and shipped. They moved to `design/icons/`.
11. **Test-script fixes, not app bugs.** Two ambiguous selectors in the verification script (two buttons legitimately share the label “Remove Tokyo from favourites”) were scoped to their regions.

## Verification performed by the AI

- `tsc -b`: no errors. `oxlint`: no warnings. `vitest`: 27/27 passing (including provider normaliser tests against an OpenWeatherMap fixture and a real captured Open-Meteo response). `vite build`: succeeds.
- Real API probes before implementation: Open-Meteo forecast (confirmed `visibility` is allowed in `current` and that `timeformat=unixtime` returns `utc_offset_seconds`), Open-Meteo geocoding, and OpenWeatherMap and GeoDB (both return 401 without keys, as expected).
- Headless Microsoft Edge against the production build: **82/82 checks** covering search, weather, fallback disclosure, units, favourites, theme, manifest and icons, the service worker and caches, real offline reload and reconnect, notifications (granted, denied, dismissed, unsupported), error states, responsive layout at 375/768/1280, touch targets and console errors.
- The OpenWeatherMap and GeoDB **primary** paths still need re-testing once real API keys are added to `.env.local`.
