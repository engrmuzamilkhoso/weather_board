import type { City } from '../types/city'
import type { WeatherSnapshot } from '../types/weather'

/** Small runtime guards for data read from storage or the network. */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

export const isString = (value: unknown): value is string => typeof value === 'string'

export function isCity(value: unknown): value is City {
  return (
    isRecord(value) &&
    isString(value.id) &&
    isString(value.name) &&
    isString(value.country) &&
    isFiniteNumber(value.latitude) &&
    isFiniteNumber(value.longitude)
  )
}

export const isCityArray = (value: unknown): value is City[] => Array.isArray(value) && value.every(isCity)

export function isWeatherSnapshot(value: unknown): value is WeatherSnapshot {
  if (!isRecord(value) || !isCity(value.city) || !isRecord(value.data)) return false
  const { data } = value
  return (
    (data.provider === 'openweathermap' || data.provider === 'open-meteo') &&
    isFiniteNumber(data.fetchedAt) &&
    isFiniteNumber(data.timezoneOffsetSec) &&
    isRecord(data.current) &&
    isFiniteNumber(data.current.tempC) &&
    Array.isArray(data.daily)
  )
}

/** Same place even if it came from different search sources (ids differ). */
export function isSameCity(a: City, b: City): boolean {
  if (a.id === b.id) return true
  const close = Math.abs(a.latitude - b.latitude) < 0.05 && Math.abs(a.longitude - b.longitude) < 0.05
  return close && a.name.toLocaleLowerCase() === b.name.toLocaleLowerCase()
}
