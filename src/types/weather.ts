import type { City } from './city'
import type { ForecastDay } from './forecast'

export type WeatherProvider = 'openweathermap' | 'open-meteo'

/**
 * Normalised condition buckets. Both OpenWeatherMap condition ids and
 * Open-Meteo WMO codes map onto these, so icons and theming never depend on a
 * specific provider.
 */
export type WeatherCondition =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunderstorm'

/** Units the API data is stored in. Display conversion happens at render time. */
export type TemperatureUnit = 'metric' | 'imperial'

export interface CurrentWeather {
  /** Epoch ms of the observation. */
  observedAt: number
  tempC: number
  feelsLikeC: number
  /** 0–100 */
  humidity: number
  windSpeedMs: number
  windDeg: number | null
  pressureHpa: number | null
  visibilityM: number | null
  cloudCover: number | null
  condition: WeatherCondition
  description: string
  isDay: boolean
  /** Epoch ms, or null when unavailable (e.g. polar day/night). */
  sunrise: number | null
  sunset: number | null
}

/** The single internal weather model the whole UI renders from. */
export interface WeatherData {
  provider: WeatherProvider
  /** Epoch ms when this data was received from the network. */
  fetchedAt: number
  /** City's UTC offset in seconds, used for local time & calendar-day grouping. */
  timezoneOffsetSec: number
  current: CurrentWeather
  /** Exactly the next five calendar days, starting with today (city-local). */
  daily: ForecastDay[]
}

export interface WeatherResult {
  data: WeatherData
  /** Why the primary provider wasn't used, when Open-Meteo answered instead. */
  fallbackReason: string | null
}

/** What gets persisted for offline use: the last successfully viewed city. */
export interface WeatherSnapshot {
  city: City
  data: WeatherData
  fallbackReason: string | null
}
