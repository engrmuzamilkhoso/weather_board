import { DATA_CACHE_NAME } from '../config/constants'

/**
 * Tiny JSON store on top of Cache Storage.
 *
 * Why Cache Storage rather than only localStorage: the service worker can't
 * read localStorage, but it *can* read Cache Storage. Data the worker needs
 * while the app is closed (last-viewed weather, reminder settings) is written
 * here by the page and read there by the worker.
 */

const hasCacheApi = () => typeof caches !== 'undefined'

export async function writeDataCache(key: string, value: unknown): Promise<boolean> {
  if (!hasCacheApi()) return false
  try {
    const cache = await caches.open(DATA_CACHE_NAME)
    await cache.put(
      key,
      new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } }),
    )
    return true
  } catch {
    return false
  }
}

export async function readDataCache(key: string): Promise<unknown> {
  if (!hasCacheApi()) return null
  try {
    const cache = await caches.open(DATA_CACHE_NAME)
    const response = await cache.match(key)
    return response ? ((await response.json()) as unknown) : null
  } catch {
    return null
  }
}
