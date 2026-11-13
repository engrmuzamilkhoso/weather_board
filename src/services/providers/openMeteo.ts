import type { City } from '../../types/city'
import type { ForecastDay } from '../../types/forecast'
import type { WeatherData } from '../../types/weather'
import { cityDateKey } from '../../utils/dateUtils'
import { isFiniteNumber, isRecord } from '../../utils/guards'
import { fromWmoCode } from '../../utils/weatherUtils'
import { ApiError, fetchJson } from '../http'

/**
 * Open-Meteo forecast API — free, keyless, CORS-enabled. Used as the fallback
 * weather provider. `timezone=auto` makes the daily buckets real calendar days
 * in the city's timezone; `timeformat=unixtime` keeps all timestamps numeric.
 */
const ENDPOINT = 'https://api.open-meteo.com/v1/forecast'
const SERVICE = 'Open-Meteo'

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'is_day',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'pressure_msl',
  'cloud_cover',
  'visibility',
] as const

const DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset',
  'precipitation_probability_max',
] as const

type Nullable<T> = T | null

interface OpenMeteoResponse {
  utc_offset_seconds: number
  current: {
    time: number
    temperature_2m: number
    relative_humidity_2m: number
    apparent_temperature: number
    is_day: number
    weather_code: number
    wind_speed_10m: number
    wind_direction_10m: Nullable<number>
    pressure_msl: Nullable<number>
    cloud_cover: Nullable<number>
    visibility: Nullable<number>
  }
  daily: {
    time: number[]
    weather_code: Nullable<number>[]
    temperature_2m_max: Nullable<number>[]
    temperature_2m_min: Nullable<number>[]
    sunrise: Nullable<number>[]
    sunset: Nullable<number>[]
    precipitation_probability_max: Nullable<number>[]
  }
}

function isOpenMeteoResponse(value: unknown): value is OpenMeteoResponse {
  if (!isRecord(value) || !isFiniteNumber(value.utc_offset_seconds)) return false
  const { current, daily } = value
  return (
    isRecord(current) &&
    isFiniteNumber(current.time) &&
    isFiniteNumber(current.temperature_2m) &&
    isFiniteNumber(current.apparent_temperature) &&
    isFiniteNumber(current.relative_humidity_2m) &&
    isFiniteNumber(current.wind_speed_10m) &&
    isFiniteNumber(current.weather_code) &&
    isRecord(daily) &&
    DAILY_FIELDS.every((field) => Array.isArray(daily[field])) &&
    Array.isArray(daily.time)
  )
}

export async function fetchOpenMeteo(city: City, signal?: AbortSignal): Promise<WeatherData> {
  const query = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: CURRENT_FIELDS.join(','),
    daily: DAILY_FIELDS.join(','),
    timezone: 'auto',
    forecast_days: '5',
    wind_speed_unit: 'ms',
    timeformat: 'unixtime',
  })
  const raw = await fetchJson(`${ENDPOINT}?${query}`, { signal, service: SERVICE })
  if (!isOpenMeteoResponse(raw)) {
    throw new ApiError('invalid-response', 'Open-Meteo returned data in an unexpected format.')
  }
  return normalizeOpenMeteo(raw)
}

const nullableNumber = (value: unknown): number | null => (isFiniteNumber(value) ? value : null)

export function normalizeOpenMeteo(raw: OpenMeteoResponse): WeatherData {
  const offsetSec = raw.utc_offset_seconds
  const { current, daily } = raw
  const now = fromWmoCode(current.weather_code)
  const toMs = (seconds: number | null | undefined) => (isFiniteNumber(seconds) ? seconds * 1000 : null)

  const days: ForecastDay[] = []
  daily.time.forEach((time, i) => {
    const min = daily.temperature_2m_min[i]
    const max = daily.temperature_2m_max[i]
    const code = daily.weather_code[i]
    // Skip days the model hasn't produced values for rather than inventing them.
    if (!isFiniteNumber(min) || !isFiniteNumber(max) || !isFiniteNumber(code)) return
    const { condition, description } = fromWmoCode(code)
    days.push({
      date: cityDateKey(time * 1000, offsetSec),
      minC: min,
      maxC: max,
      condition,
      description,
      precipitationChance: nullableNumber(daily.precipitation_probability_max[i]),
    })
  })

  return {
    provider: 'open-meteo',
    fetchedAt: Date.now(),
    timezoneOffsetSec: offsetSec,
    current: {
      observedAt: current.time * 1000,
      tempC: current.temperature_2m,
      feelsLikeC: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      windSpeedMs: current.wind_speed_10m,
      windDeg: nullableNumber(current.wind_direction_10m),
      pressureHpa: nullableNumber(current.pressure_msl),
      visibilityM: nullableNumber(current.visibility),
      cloudCover: nullableNumber(current.cloud_cover),
      condition: now.condition,
      description: now.description,
      isDay: current.is_day === 1,
      sunrise: toMs(daily.sunrise[0]),
      sunset: toMs(daily.sunset[0]),
    },
    daily: days.slice(0, 5),
  }
}
