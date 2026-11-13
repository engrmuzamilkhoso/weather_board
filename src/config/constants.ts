/**
 * Shared keys. The Cache Storage names/paths are ALSO hard-coded in
 * public/service-worker.js (a plain script that can't import this module) —
 * keep the two in sync.
 */
export const STORAGE_KEYS = {
  favorites: 'weatherboard:favorites',
  theme: 'weatherboard:theme',
  unit: 'weatherboard:unit',
  reminder: 'weatherboard:reminder',
  lastWeather: 'weatherboard:last-weather',
} as const

/** Cache Storage bucket shared between the page and the service worker. */
export const DATA_CACHE_NAME = 'weatherboard-data-v1'
export const DATA_CACHE_KEYS = {
  lastWeather: '/__weatherboard/last-weather.json',
  reminder: '/__weatherboard/reminder.json',
} as const

export const MAX_FAVORITES = 5

/** Debounce for city autocomplete; keeps suggestions under ~300 ms after typing stops. */
export const SEARCH_DEBOUNCE_MS = 250
export const SEARCH_MIN_CHARS = 2

export const PERIODIC_SYNC_TAG = 'weatherboard-daily-reminder'
/** A reminder that's missed by more than this (device asleep, app closed) is skipped for the day. */
export const REMINDER_GRACE_MINUTES = 240
