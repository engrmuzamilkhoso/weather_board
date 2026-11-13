import type { TemperatureUnit, WeatherCondition } from '../types/weather'

// ---------------------------------------------------------------------------
// Unit conversion — data is always stored metric; conversion is display-only,
// so switching °C/°F never refetches.
// ---------------------------------------------------------------------------

export const celsiusToFahrenheit = (c: number) => (c * 9) / 5 + 32

export function convertTemperature(celsius: number, unit: TemperatureUnit): number {
  return unit === 'imperial' ? celsiusToFahrenheit(celsius) : celsius
}

/** Rounded temperature with degree sign, e.g. "21°". Avoids "-0°". */
export function formatTemperature(celsius: number, unit: TemperatureUnit): string {
  const rounded = Math.round(convertTemperature(celsius, unit))
  return `${Object.is(rounded, -0) ? 0 : rounded}°`
}

export const temperatureUnitLabel = (unit: TemperatureUnit) => (unit === 'imperial' ? '°F' : '°C')

export function formatWindSpeed(ms: number, unit: TemperatureUnit): string {
  return unit === 'imperial' ? `${Math.round(ms * 2.236936)} mph` : `${Math.round(ms * 3.6)} km/h`
}

export function formatVisibility(meters: number, unit: TemperatureUnit): string {
  if (unit === 'imperial') {
    const miles = meters / 1609.344
    return `${miles >= 10 ? Math.round(miles) : miles.toFixed(1)} mi`
  }
  const km = meters / 1000
  return `${km >= 10 ? Math.round(km) : km.toFixed(1)} km`
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const
export function windDirectionLabel(deg: number): string {
  return COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8] ?? 'N'
}

// ---------------------------------------------------------------------------
// Condition mapping — each provider's codes collapse to WeatherCondition.
// ---------------------------------------------------------------------------

/** OpenWeatherMap condition ids: https://openweathermap.org/weather-conditions */
export function conditionFromOpenWeatherId(id: number): WeatherCondition {
  if (id >= 200 && id < 300) return 'thunderstorm'
  if (id >= 300 && id < 400) return 'drizzle'
  if (id === 511) return 'snow' // freezing rain
  if (id >= 500 && id < 600) return 'rain'
  if (id >= 600 && id < 700) return 'snow'
  if (id >= 700 && id < 800) return 'fog'
  if (id === 800) return 'clear'
  if (id === 801 || id === 802) return 'partly-cloudy'
  return 'cloudy'
}

/** WMO weather interpretation codes used by Open-Meteo. */
const WMO: Record<number, [WeatherCondition, string]> = {
  0: ['clear', 'Clear sky'],
  1: ['partly-cloudy', 'Mainly clear'],
  2: ['partly-cloudy', 'Partly cloudy'],
  3: ['cloudy', 'Overcast'],
  45: ['fog', 'Fog'],
  48: ['fog', 'Depositing rime fog'],
  51: ['drizzle', 'Light drizzle'],
  53: ['drizzle', 'Moderate drizzle'],
  55: ['drizzle', 'Dense drizzle'],
  56: ['drizzle', 'Light freezing drizzle'],
  57: ['drizzle', 'Dense freezing drizzle'],
  61: ['rain', 'Slight rain'],
  63: ['rain', 'Moderate rain'],
  65: ['rain', 'Heavy rain'],
  66: ['rain', 'Light freezing rain'],
  67: ['rain', 'Heavy freezing rain'],
  71: ['snow', 'Slight snowfall'],
  73: ['snow', 'Moderate snowfall'],
  75: ['snow', 'Heavy snowfall'],
  77: ['snow', 'Snow grains'],
  80: ['rain', 'Slight rain showers'],
  81: ['rain', 'Moderate rain showers'],
  82: ['rain', 'Violent rain showers'],
  85: ['snow', 'Slight snow showers'],
  86: ['snow', 'Heavy snow showers'],
  95: ['thunderstorm', 'Thunderstorm'],
  96: ['thunderstorm', 'Thunderstorm with slight hail'],
  99: ['thunderstorm', 'Thunderstorm with heavy hail'],
}

export function fromWmoCode(code: number): { condition: WeatherCondition; description: string } {
  const entry = WMO[code]
  return entry ? { condition: entry[0], description: entry[1] } : { condition: 'cloudy', description: 'Unknown conditions' }
}

/** "light rain" → "Light rain" */
export function capitalize(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}
