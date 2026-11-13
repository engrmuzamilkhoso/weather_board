import { DATA_CACHE_KEYS, PERIODIC_SYNC_TAG } from '../config/constants'
import type { TemperatureUnit, WeatherSnapshot } from '../types/weather'
import { formatRelativeTime } from '../utils/dateUtils'
import { isRecord } from '../utils/guards'
import { formatTemperature } from '../utils/weatherUtils'
import { readDataCache, writeDataCache } from './dataCache'

/**
 * Daily reminder delivery — what is genuinely possible without a backend:
 *
 *  ✔ While WeatherBoard is open (any tab, including in the background):
 *    a page-level scheduler checks every 30 s and shows the notification
 *    through the service worker. Reliable, exact time.
 *  ✔ When the app is closed, on Chromium with the PWA installed:
 *    Periodic Background Sync wakes the service worker roughly once a day
 *    (the browser picks the timing based on engagement — typically ≥12 h
 *    between runs). The worker fetches fresh weather and notifies. Not exact.
 *  ✘ Exact-time delivery with the browser fully closed on every browser:
 *    needs Web Push from a server (VAPID keys + a scheduler), which the
 *    challenge rules out. The Notification Triggers API that would have
 *    allowed this client-side never shipped (Chrome origin trial ended).
 */

export type NotificationAccess = NotificationPermission | 'unsupported'

export interface NotificationCapabilities {
  notifications: boolean
  serviceWorker: boolean
  periodicSync: boolean
  push: boolean
  standalone: boolean
}

/** How reminders will reach the user when the app is closed. */
export type BackgroundStatus =
  | 'active' // periodic sync registered
  | 'needs-install' // supported, but browser only grants it to installed apps
  | 'unsupported' // Firefox / Safari / no service worker
  | 'checking'

/** Persisted in Cache Storage so the service worker can read it. */
export interface ReminderSharedState {
  enabled: boolean
  time: string
  unit: TemperatureUnit
  /** Device-local YYYY-MM-DD of the last reminder shown (dedupes page + worker). */
  lastShownDate: string | null
}

export function getCapabilities(): NotificationCapabilities {
  const hasWindow = typeof window !== 'undefined'
  const serviceWorker = hasWindow && 'serviceWorker' in navigator
  return {
    notifications: hasWindow && 'Notification' in window,
    serviceWorker,
    periodicSync: serviceWorker && typeof ServiceWorkerRegistration !== 'undefined' && 'periodicSync' in ServiceWorkerRegistration.prototype,
    push: hasWindow && 'PushManager' in window,
    standalone:
      hasWindow && (window.matchMedia?.('(display-mode: standalone)').matches === true || navigator.standalone === true),
  }
}

export function getPermission(): NotificationAccess {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
}

export async function requestPermission(): Promise<NotificationAccess> {
  if (typeof Notification === 'undefined') return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** The active registration, without waiting forever (there is none in `vite dev`). */
async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return (await navigator.serviceWorker.getRegistration()) ?? null
  } catch {
    return null
  }
}

/**
 * Shows a notification. Prefers ServiceWorkerRegistration.showNotification —
 * required on Android Chrome, where `new Notification()` throws.
 */
export async function showNotification(title: string, options: NotificationOptions): Promise<void> {
  if (getPermission() !== 'granted') throw new Error('Notification permission has not been granted.')
  const registration = await getRegistration()
  const withDefaults: NotificationOptions = { icon: '/icons/icon-192.png', badge: '/icons/badge-96.png', ...options }
  if (registration) {
    await registration.showNotification(title, withDefaults)
    return
  }
  new Notification(title, withDefaults)
}

export async function registerBackgroundReminder(): Promise<BackgroundStatus> {
  const registration = await getRegistration()
  if (!registration?.periodicSync) return 'unsupported'
  try {
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' as PermissionName })
    if (status.state !== 'granted') return 'needs-install'
  } catch {
    /* permissions.query may not know this name — try registering anyway */
  }
  try {
    // The browser enforces its own minimum (often 12 h+); asking for 1 h just
    // means "as often as you're willing to".
    await registration.periodicSync.register(PERIODIC_SYNC_TAG, { minInterval: 60 * 60 * 1000 })
    return 'active'
  } catch {
    return 'needs-install'
  }
}

export async function unregisterBackgroundReminder(): Promise<void> {
  const registration = await getRegistration()
  try {
    await registration?.periodicSync?.unregister(PERIODIC_SYNC_TAG)
  } catch {
    /* nothing registered */
  }
}

export async function readReminderState(): Promise<ReminderSharedState | null> {
  const value = await readDataCache(DATA_CACHE_KEYS.reminder)
  if (!isRecord(value) || typeof value.enabled !== 'boolean' || typeof value.time !== 'string') return null
  return {
    enabled: value.enabled,
    time: value.time,
    unit: value.unit === 'imperial' ? 'imperial' : 'metric',
    lastShownDate: typeof value.lastShownDate === 'string' ? value.lastShownDate : null,
  }
}

export async function writeReminderState(patch: Partial<ReminderSharedState>): Promise<void> {
  const current = (await readReminderState()) ?? { enabled: false, time: '07:30', unit: 'metric', lastShownDate: null }
  await writeDataCache(DATA_CACHE_KEYS.reminder, { ...current, ...patch })
}

/** Builds the reminder text. `isLive` false → the message says how old the data is. */
export function buildReminderContent(snapshot: WeatherSnapshot, unit: TemperatureUnit, isLive: boolean): { title: string; body: string } {
  const { city, data } = snapshot
  const today = data.daily[0]
  const temp = formatTemperature(data.current.tempC, unit)
  const parts = [
    today ? `Today: high ${formatTemperature(today.maxC, unit)}, low ${formatTemperature(today.minC, unit)}.` : null,
    `Feels like ${formatTemperature(data.current.feelsLikeC, unit)}.`,
    today?.precipitationChance != null && today.precipitationChance > 0 ? `${today.precipitationChance}% chance of rain.` : null,
    isLive ? null : `(Last updated ${formatRelativeTime(data.fetchedAt)})`,
  ]
  return {
    title: `Good morning — ${city.name}: ${temp}, ${data.current.description.toLowerCase()}`,
    body: parts.filter(Boolean).join(' '),
  }
}
