import { DATA_CACHE_KEYS, STORAGE_KEYS } from '../config/constants'
import type { WeatherSnapshot } from '../types/weather'
import { isWeatherSnapshot } from '../utils/guards'
import { readDataCache, writeDataCache } from './dataCache'
import { storageService } from './storageService'

/**
 * Persists the last successfully fetched city + weather so it can be shown
 * offline. Only ONE snapshot is kept (the last-viewed city); each successful
 * fetch overwrites it.
 *
 * Written to Cache Storage (readable by the service worker for reminders) and
 * mirrored to localStorage (in case Cache Storage is unavailable, e.g. some
 * private modes or non-secure contexts).
 */
export async function saveSnapshot(snapshot: WeatherSnapshot): Promise<void> {
  storageService.set(STORAGE_KEYS.lastWeather, snapshot)
  await writeDataCache(DATA_CACHE_KEYS.lastWeather, snapshot)
}

export async function loadSnapshot(): Promise<WeatherSnapshot | null> {
  const fromCache = await readDataCache(DATA_CACHE_KEYS.lastWeather)
  const fromStorage = storageService.get(STORAGE_KEYS.lastWeather, isWeatherSnapshot)
  const candidates = [fromCache, fromStorage].filter(isWeatherSnapshot)
  if (candidates.length === 0) return null
  // Prefer whichever copy is newest.
  return candidates.reduce((a, b) => (b.data.fetchedAt > a.data.fetchedAt ? b : a))
}
