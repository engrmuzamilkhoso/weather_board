import { env } from '../config/env'
import type { City, CitySearchResult } from '../types/city'
import { isFiniteNumber, isRecord, isString } from '../utils/guards'
import { ApiError, fetchJson, isAbortError, sleep } from './http'

/**
 * City search: GeoDB Cities (RapidAPI) first, Open-Meteo Geocoding as fallback.
 *
 * GeoDB's free plan allows 1 request/second, so we:
 *  1. cache results per query (typing "lon" → "lond" → back to "lon" is free),
 *  2. space requests ≥ 1.1 s apart (the debounced caller cancels stale ones),
 *  3. retry a 429 once after the server's Retry-After,
 *  4. then fall back to Open-Meteo so search keeps working.
 */

const RESULT_LIMIT = 8
const GEODB_MIN_INTERVAL_MS = 1100
const CACHE_LIMIT = 50

const cache = new Map<string, CitySearchResult>()
let lastGeoDbRequestAt = 0

export async function searchCities(rawQuery: string, signal?: AbortSignal): Promise<CitySearchResult> {
  // "Paris, France" → search "Paris"; the dropdown shows the country anyway.
  const query = (rawQuery.split(',')[0] ?? '').trim()
  const cacheKey = query.toLocaleLowerCase()
  const cached = cache.get(cacheKey)
  if (cached) return cached

  let result: CitySearchResult
  if (!env.rapidApiKey) {
    result = await searchOpenMeteo(query, signal, 'City search is using Open-Meteo because GeoDB isn’t configured.')
  } else {
    try {
      result = { cities: await searchGeoDb(query, signal), source: 'geodb', notice: null }
    } catch (error) {
      if (isAbortError(error)) throw error
      if (error instanceof ApiError && error.kind === 'offline') throw error
      result = await searchOpenMeteo(query, signal, geoDbFallbackNotice(error))
    }
  }

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value ?? '')
  cache.set(cacheKey, result)
  return result
}

function geoDbFallbackNotice(error: unknown): string {
  const reason =
    error instanceof ApiError && error.kind === 'rate-limit'
      ? 'GeoDB’s rate limit was reached'
      : error instanceof ApiError && error.kind === 'unauthorized'
        ? 'GeoDB rejected the API key'
        : 'GeoDB is unavailable'
  return `${reason}, so these results come from Open-Meteo.`
}

// --- GeoDB ------------------------------------------------------------------

interface GeoDbCity {
  id: number
  type: string
  name: string
  country: string
  countryCode: string
  region: string | null
  latitude: number
  longitude: number
}

function isGeoDbCity(value: unknown): value is GeoDbCity {
  return (
    isRecord(value) &&
    isFiniteNumber(value.id) &&
    isString(value.name) &&
    isString(value.country) &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude)
  )
}

async function searchGeoDb(query: string, signal?: AbortSignal, isRetry = false): Promise<City[]> {
  const wait = lastGeoDbRequestAt + GEODB_MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await sleep(wait, signal)
  lastGeoDbRequestAt = Date.now()

  const params = new URLSearchParams({
    namePrefix: query,
    limit: String(RESULT_LIMIT),
    sort: '-population',
    types: 'CITY',
  })
  try {
    const raw = await fetchJson(`https://${env.rapidApiHost}/v1/geo/cities?${params}`, {
      signal,
      service: 'GeoDB Cities',
      timeoutMs: 8000,
      headers: { 'X-RapidAPI-Key': env.rapidApiKey, 'X-RapidAPI-Host': env.rapidApiHost },
    })
    if (!isRecord(raw) || !Array.isArray(raw.data)) {
      throw new ApiError('invalid-response', 'GeoDB Cities returned data in an unexpected format.')
    }
    return raw.data.filter(isGeoDbCity).map(
      (c): City => ({
        id: `geodb:${c.id}`,
        name: c.name,
        region: c.region || null,
        country: c.country,
        countryCode: c.countryCode || null,
        latitude: c.latitude,
        longitude: c.longitude,
      }),
    )
  } catch (error) {
    if (!isRetry && error instanceof ApiError && error.kind === 'rate-limit') {
      await sleep(error.retryAfterMs ?? GEODB_MIN_INTERVAL_MS, signal)
      return searchGeoDb(query, signal, true)
    }
    throw error
  }
}

// --- Open-Meteo Geocoding ---------------------------------------------------

interface OpenMeteoPlace {
  id: number
  name: string
  latitude: number
  longitude: number
  country?: string
  country_code?: string
  admin1?: string
}

function isOpenMeteoPlace(value: unknown): value is OpenMeteoPlace {
  return isRecord(value) && isFiniteNumber(value.id) && isString(value.name) && isFiniteNumber(value.latitude) && isFiniteNumber(value.longitude)
}

async function searchOpenMeteo(query: string, signal: AbortSignal | undefined, notice: string): Promise<CitySearchResult> {
  const params = new URLSearchParams({ name: query, count: String(RESULT_LIMIT), language: 'en', format: 'json' })
  const raw = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
    signal,
    service: 'City search',
    timeoutMs: 8000,
  })
  if (!isRecord(raw)) throw new ApiError('invalid-response', 'City search returned data in an unexpected format.')
  // Open-Meteo omits `results` entirely when nothing matches.
  const results = Array.isArray(raw.results) ? raw.results.filter(isOpenMeteoPlace) : []
  return {
    source: 'open-meteo',
    notice,
    cities: results.map(
      (p): City => ({
        id: `om:${p.id}`,
        name: p.name,
        region: p.admin1 ?? null,
        country: p.country ?? p.country_code ?? 'Unknown country',
        countryCode: p.country_code ?? null,
        latitude: p.latitude,
        longitude: p.longitude,
      }),
    ),
  }
}

/** Specific, user-facing explanation for a failed search. */
export function searchErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.kind) {
      case 'offline':
        return 'You’re offline. City search needs an internet connection.'
      case 'network':
        return 'Couldn’t reach the city search service. Check your connection and try again.'
      case 'timeout':
        return 'City search is taking too long to respond. Try again in a moment.'
      case 'rate-limit':
        return 'Too many searches in a short time. Pause for a second and try again.'
      default:
        return `City search failed: ${error.message}`
    }
  }
  return 'City search failed unexpectedly. Please try again.'
}
