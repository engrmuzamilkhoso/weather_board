import { env } from '../../config/env'
import type { City } from '../../types/city'
import type { WeatherData } from '../../types/weather'
import { aggregateThreeHourForecast, type ThreeHourSlot } from '../../utils/forecastUtils'
import { isFiniteNumber, isRecord } from '../../utils/guards'
import { capitalize, conditionFromOpenWeatherId } from '../../utils/weatherUtils'
import { ApiError, fetchJson } from '../http'

/**
 * OpenWeatherMap free-tier endpoints (verified against a free key's access):
 *  - GET /data/2.5/weather   current conditions
 *  - GET /data/2.5/forecast  5 days × 3-hour slots (40 items)
 * One Call 3.0 would give a daily forecast directly but needs a separate
 * subscription, so it's deliberately not used.
 */
const BASE = 'https://api.openweathermap.org/data/2.5'
const SERVICE = 'OpenWeatherMap'

// --- Response types (only the fields we read) ------------------------------

interface OwmCondition {
  id: number
  main: string
  description: string
  icon: string
}

interface OwmCurrentResponse {
  weather: OwmCondition[]
  main: { temp: number; feels_like: number; pressure: number; humidity: number }
  visibility?: number
  wind: { speed: number; deg?: number }
  clouds?: { all: number }
  dt: number
  sys: { sunrise?: number; sunset?: number }
  timezone: number
}

interface OwmForecastItem {
  dt: number
  main: { temp: number; temp_min: number; temp_max: number }
  weather: OwmCondition[]
  pop?: number
}

interface OwmForecastResponse {
  list: OwmForecastItem[]
  city: { timezone: number }
}

function isCondition(value: unknown): value is OwmCondition {
  return isRecord(value) && isFiniteNumber(value.id) && typeof value.description === 'string' && typeof value.icon === 'string'
}

function isCurrentResponse(value: unknown): value is OwmCurrentResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.weather) &&
    isCondition(value.weather[0]) &&
    isRecord(value.main) &&
    isFiniteNumber(value.main.temp) &&
    isFiniteNumber(value.main.feels_like) &&
    isFiniteNumber(value.main.humidity) &&
    isRecord(value.wind) &&
    isFiniteNumber(value.wind.speed) &&
    isFiniteNumber(value.dt) &&
    isRecord(value.sys) &&
    isFiniteNumber(value.timezone)
  )
}

function isForecastResponse(value: unknown): value is OwmForecastResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.list) &&
    value.list.every(
      (item) => isRecord(item) && isFiniteNumber(item.dt) && isRecord(item.main) && isFiniteNumber(item.main.temp) && Array.isArray(item.weather) && isCondition(item.weather[0]),
    ) &&
    isRecord(value.city) &&
    isFiniteNumber(value.city.timezone)
  )
}

// --- Fetch + normalise ------------------------------------------------------

export async function fetchOpenWeatherMap(city: City, signal?: AbortSignal): Promise<WeatherData> {
  if (!env.openWeatherApiKey) {
    throw new ApiError('missing-key', 'OpenWeatherMap API key is not configured.')
  }
  const query = new URLSearchParams({
    lat: String(city.latitude),
    lon: String(city.longitude),
    units: 'metric',
    appid: env.openWeatherApiKey,
  })

  const [currentRaw, forecastRaw] = await Promise.all([
    fetchJson(`${BASE}/weather?${query}`, { signal, service: SERVICE }),
    fetchJson(`${BASE}/forecast?${query}`, { signal, service: SERVICE }),
  ])

  if (!isCurrentResponse(currentRaw) || !isForecastResponse(forecastRaw)) {
    throw new ApiError('invalid-response', 'OpenWeatherMap returned data in an unexpected format.')
  }
  return normalizeOpenWeatherMap(currentRaw, forecastRaw)
}

export function normalizeOpenWeatherMap(current: OwmCurrentResponse, forecast: OwmForecastResponse): WeatherData {
  // Non-null: guaranteed by isCurrentResponse.
  const condition = current.weather[0]!
  const offsetSec = current.timezone
  const observedAt = current.dt * 1000

  const slots: ThreeHourSlot[] = forecast.list.map((item) => {
    const c = item.weather[0]!
    return {
      time: item.dt * 1000,
      minC: item.main.temp_min,
      maxC: item.main.temp_max,
      condition: conditionFromOpenWeatherId(c.id),
      description: capitalize(c.description),
      pop: isFiniteNumber(item.pop) ? item.pop : null,
    }
  })

  return {
    provider: 'openweathermap',
    fetchedAt: Date.now(),
    timezoneOffsetSec: offsetSec,
    current: {
      observedAt,
      tempC: current.main.temp,
      feelsLikeC: current.main.feels_like,
      humidity: current.main.humidity,
      windSpeedMs: current.wind.speed,
      windDeg: isFiniteNumber(current.wind.deg) ? current.wind.deg : null,
      pressureHpa: isFiniteNumber(current.main.pressure) ? current.main.pressure : null,
      visibilityM: isFiniteNumber(current.visibility) ? current.visibility : null,
      cloudCover: isFiniteNumber(current.clouds?.all) ? current.clouds.all : null,
      condition: conditionFromOpenWeatherId(condition.id),
      description: capitalize(condition.description),
      isDay: condition.icon.endsWith('d'),
      sunrise: isFiniteNumber(current.sys.sunrise) && current.sys.sunrise > 0 ? current.sys.sunrise * 1000 : null,
      sunset: isFiniteNumber(current.sys.sunset) && current.sys.sunset > 0 ? current.sys.sunset * 1000 : null,
    },
    daily: aggregateThreeHourForecast(slots, offsetSec, {
      time: observedAt,
      tempC: current.main.temp,
      condition: conditionFromOpenWeatherId(condition.id),
      description: capitalize(condition.description),
    }),
  }
}
