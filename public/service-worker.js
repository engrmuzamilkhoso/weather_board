/* WeatherBoard service worker — plain JS, no build step except one injected line.
 *
 * Caches
 *   weatherboard-shell-<version>  app shell + hashed assets (precached on install,
 *                                 replaced wholesale when a new build ships)
 *   weatherboard-data-v1          last-viewed weather + reminder settings, written
 *                                 by the page; survives app updates
 *
 * Strategies
 *   navigations          network-first (4 s timeout) → cached shell
 *   same-origin assets   cache-first (hashed names are immutable)
 *   third-party APIs     not intercepted — the app handles failures itself and
 *                        falls back to the saved snapshot, labelled as cached
 *
 * Keep the constants below in sync with src/config/constants.ts.
 */

/* @build-manifest */ const BUILD = { version: 'dev', precache: ['/'] }; /* @end-build-manifest */

const SHELL_CACHE = `weatherboard-shell-${BUILD.version}`
const DATA_CACHE = 'weatherboard-data-v1'
const LAST_WEATHER_KEY = '/__weatherboard/last-weather.json'
const REMINDER_KEY = '/__weatherboard/reminder.json'
const REMINDER_TAG = 'weatherboard-daily-reminder'
const REMINDER_GRACE_MINUTES = 240
const NAVIGATION_TIMEOUT_MS = 4000

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(BUILD.precache)))
  // No automatic skipWaiting: an update waits until the user accepts it, so a
  // page never runs against assets from a different build.
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith('weatherboard-') && name !== SHELL_CACHE && name !== DATA_CACHE)
          .map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/__weatherboard/')) {
    event.respondWith(serveData(url.pathname))
  } else if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
  } else {
    event.respondWith(cacheFirst(request))
  }
})

async function networkFirstNavigation(request) {
  const cache = await caches.open(SHELL_CACHE)
  try {
    const response = await withTimeout(fetch(request), NAVIGATION_TIMEOUT_MS)
    if (response.ok) await cache.put('/', response.clone())
    return response
  } catch {
    const cached = await cache.match('/')
    return cached || offlinePage()
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(SHELL_CACHE)
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    return Response.error()
  }
}

async function serveData(pathname) {
  const cache = await caches.open(DATA_CACHE)
  const cached = await cache.match(pathname)
  return cached || new Response('null', { status: 404, headers: { 'Content-Type': 'application/json' } })
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

function offlinePage() {
  return new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>WeatherBoard — offline</title>' +
      '<body style="font-family:system-ui;padding:2rem;max-width:32rem;margin:auto"><h1>You’re offline</h1>' +
      '<p>WeatherBoard hasn’t finished saving itself for offline use yet. Reconnect and reload once, and it will open offline next time.</p></body>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

// ---------------------------------------------------------------------------
// Daily reminder (Periodic Background Sync — Chromium, installed PWA only)
// ---------------------------------------------------------------------------

self.addEventListener('periodicsync', (event) => {
  if (event.tag === REMINDER_TAG) event.waitUntil(runDailyReminder())
})

async function readData(key) {
  try {
    const cache = await caches.open(DATA_CACHE)
    const response = await cache.match(key)
    return response ? await response.json() : null
  } catch {
    return null
  }
}

async function writeData(key, value) {
  const cache = await caches.open(DATA_CACHE)
  await cache.put(key, new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }))
}

function localDateKey(date) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

async function runDailyReminder() {
  const state = await readData(REMINDER_KEY)
  if (!state || !state.enabled || typeof state.time !== 'string') return
  if (self.Notification && self.Notification.permission !== 'granted') return

  const now = new Date()
  const [h, m] = state.time.split(':').map(Number)
  const minutesNow = now.getHours() * 60 + now.getMinutes()
  const due = h * 60 + m
  const today = localDateKey(now)
  // Only notify on/after the chosen time, within the grace window, once a day.
  if (minutesNow < due || minutesNow > due + REMINDER_GRACE_MINUTES || state.lastShownDate === today) return

  const snapshot = await readData(LAST_WEATHER_KEY)
  const unit = state.unit === 'imperial' ? 'imperial' : 'metric'
  let title = 'Good morning from WeatherBoard'
  let body = 'Open WeatherBoard to see today’s forecast.'

  if (snapshot && snapshot.city) {
    const fresh = await fetchQuickForecast(snapshot.city)
    if (fresh) {
      title = `Good morning — ${snapshot.city.name}: ${fmt(fresh.temp, unit)}, ${fresh.description.toLowerCase()}`
      body = `Today: high ${fmt(fresh.max, unit)}, low ${fmt(fresh.min, unit)}. Feels like ${fmt(fresh.feels, unit)}.`
      if (fresh.rain > 0) body += ` ${fresh.rain}% chance of rain.`
    } else if (snapshot.data && snapshot.data.current) {
      // Network failed: be explicit that this is saved data.
      const c = snapshot.data.current
      title = `${snapshot.city.name}: ${fmt(c.tempC, unit)}, ${String(c.description).toLowerCase()}`
      body = 'Couldn’t fetch a fresh forecast — this is the last saved reading. Open WeatherBoard to refresh.'
    }
  }

  await self.registration.showNotification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: 'weatherboard-daily',
    data: { url: '/' },
  })
  await writeData(REMINDER_KEY, { ...state, lastShownDate: today })
}

function fmt(celsius, unit) {
  const value = unit === 'imperial' ? (celsius * 9) / 5 + 32 : celsius
  const rounded = Math.round(value)
  return `${rounded === 0 ? 0 : rounded}°`
}

// Keyless Open-Meteo call — the worker never needs the OpenWeatherMap key.
async function fetchQuickForecast(city) {
  try {
    const params = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      current: 'temperature_2m,apparent_temperature,weather_code',
      daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'auto',
      forecast_days: '1',
    })
    const response = await withTimeout(fetch(`https://api.open-meteo.com/v1/forecast?${params}`), 8000)
    if (!response.ok) return null
    const json = await response.json()
    return {
      temp: json.current.temperature_2m,
      feels: json.current.apparent_temperature,
      description: describeWmo(json.current.weather_code),
      max: json.daily.temperature_2m_max[0],
      min: json.daily.temperature_2m_min[0],
      rain: json.daily.precipitation_probability_max[0] || 0,
    }
  } catch {
    return null
  }
}

function describeWmo(code) {
  if (code === 0) return 'Clear sky'
  if (code <= 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'Rain'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'Snow'
  if (code >= 95) return 'Thunderstorm'
  return 'Mixed conditions'
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = (event.notification.data && event.notification.data.url) || '/'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((client) => new URL(client.url).origin === self.location.origin)
      if (existing) return existing.focus()
      return self.clients.openWindow(target)
    })(),
  )
})
