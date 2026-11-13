import type { WeatherCondition } from './weather'

/** One calendar day in the city's own timezone. Temperatures are always °C internally. */
export interface ForecastDay {
  /** `YYYY-MM-DD` in the city's local timezone. */
  date: string
  minC: number
  maxC: number
  condition: WeatherCondition
  description: string
  /** 0–100, or null when the provider doesn't supply it. */
  precipitationChance: number | null
}
