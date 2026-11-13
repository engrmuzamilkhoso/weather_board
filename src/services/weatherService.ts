import type { City } from '../types/city'
import type { WeatherResult } from '../types/weather'
import { ApiError, isAbortError } from './http'
import { fetchOpenMeteo } from './providers/openMeteo'
import { fetchOpenWeatherMap } from './providers/openWeatherMap'

/**
 * Weather orchestration: OpenWeatherMap first, Open-Meteo as fallback.
 *
 * Both providers return the same internal `WeatherData`, so the UI never sees
 * provider-specific shapes. When the fallback answers, `fallbackReason` tells
 * the UI why, so it can be transparent about the source. Cancellation
 * (AbortError) is never treated as a failure and never triggers the fallback.
 */
export async function getWeather(city: City, signal?: AbortSignal): Promise<WeatherResult> {
  let primaryError: unknown
  try {
    return { data: await fetchOpenWeatherMap(city, signal), fallbackReason: null }
  } catch (error) {
    if (isAbortError(error)) throw error
    primaryError = error
    // No point trying a second network call when the device is offline.
    if (error instanceof ApiError && error.kind === 'offline') throw error
  }

  try {
    const data = await fetchOpenMeteo(city, signal)
    return { data, fallbackReason: describePrimaryFailure(primaryError) }
  } catch (fallbackError) {
    if (isAbortError(fallbackError)) throw fallbackError
    throw new WeatherUnavailableError(primaryError, fallbackError)
  }
}

function describePrimaryFailure(error: unknown): string {
  if (!(error instanceof ApiError)) return 'OpenWeatherMap returned an unexpected error.'
  switch (error.kind) {
    case 'missing-key':
      return 'OpenWeatherMap isn’t configured (no API key).'
    case 'unauthorized':
      return 'OpenWeatherMap rejected the API key.'
    case 'rate-limit':
      return 'OpenWeatherMap’s rate limit was reached.'
    case 'timeout':
      return 'OpenWeatherMap timed out.'
    default:
      return 'OpenWeatherMap is unavailable right now.'
  }
}

/** Both providers failed. Carries a specific, user-facing explanation. */
export class WeatherUnavailableError extends Error {
  readonly isNetworkProblem: boolean

  constructor(primary: unknown, fallback: unknown) {
    const kinds = [primary, fallback].map((e) => (e instanceof ApiError ? e.kind : 'unknown'))
    const isNetworkProblem = kinds.every((k) => k === 'network' || k === 'offline' || k === 'timeout')
    super(
      isNetworkProblem
        ? 'We couldn’t reach either weather service. Check your internet connection and try again.'
        : `Both weather services failed: ${describePrimaryFailure(primary)} Open-Meteo: ${
            fallback instanceof ApiError ? fallback.message : 'unexpected error.'
          } Please try again in a minute.`,
    )
    this.name = 'WeatherUnavailableError'
    this.isNetworkProblem = isNetworkProblem
  }
}

/** Maps any error from getWeather into a message suitable for the UI. */
export function weatherErrorMessage(error: unknown): string {
  if (error instanceof WeatherUnavailableError) return error.message
  if (error instanceof ApiError && error.kind === 'offline') {
    return 'You’re offline. Connect to the internet to load weather for this city.'
  }
  if (error instanceof ApiError) return error.message
  return 'Weather couldn’t be loaded because of an unexpected error. Please try again.'
}
