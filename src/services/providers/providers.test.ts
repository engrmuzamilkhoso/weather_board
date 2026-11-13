import { describe, expect, it } from 'vitest'
import { normalizeOpenMeteo } from './openMeteo'
import { normalizeOpenWeatherMap } from './openWeatherMap'

// Shaped like OpenWeatherMap's documented /data/2.5/weather and /forecast responses (trimmed).
const owmCurrent = {
  coord: { lon: 67.01, lat: 24.86 },
  weather: [{ id: 721, main: 'Haze', description: 'haze', icon: '50d' }],
  main: { temp: 29.9, feels_like: 31.2, temp_min: 29.9, temp_max: 29.9, pressure: 1012, humidity: 48 },
  visibility: 4000,
  wind: { speed: 4.12, deg: 250 },
  clouds: { all: 0 },
  dt: 1794560400, // 2026-11-13 07:00 UTC = 12:00 in Karachi (UTC+5)
  sys: { country: 'PK', sunrise: 1794535385, sunset: 1794575240 },
  timezone: 18000,
  name: 'Karachi',
}

const owmForecast = {
  list: Array.from({ length: 40 }, (_, i) => ({
    dt: 1794571200 + i * 10800, // starts 10:00 UTC (15:00 local)
    main: { temp: 25 + (i % 8), temp_min: 25 + (i % 8), temp_max: 25 + (i % 8) },
    weather: [{ id: i % 8 === 7 ? 500 : 800, main: 'x', description: i % 8 === 7 ? 'light rain' : 'clear sky', icon: '01d' }],
    pop: i === 9 ? 0.45 : 0,
  })),
  city: { timezone: 18000, sunrise: 1794535385, sunset: 1794575240 },
}

describe('normalizeOpenWeatherMap', () => {
  const data = normalizeOpenWeatherMap(owmCurrent, owmForecast)

  it('maps current conditions into the internal model', () => {
    expect(data.provider).toBe('openweathermap')
    expect(data.timezoneOffsetSec).toBe(18000)
    expect(data.current).toMatchObject({
      tempC: 29.9,
      feelsLikeC: 31.2,
      humidity: 48,
      windSpeedMs: 4.12,
      windDeg: 250,
      pressureHpa: 1012,
      visibilityM: 4000,
      cloudCover: 0,
      condition: 'fog',
      description: 'Haze',
      isDay: true,
      sunrise: 1794535385000,
      sunset: 1794575240000,
    })
  })

  it('produces five distinct calendar days starting with the city’s today', () => {
    expect(data.daily).toHaveLength(5)
    expect(data.daily[0]?.date).toBe('2026-11-13')
    expect(new Set(data.daily.map((d) => d.date)).size).toBe(5)
    for (const day of data.daily) expect(day.maxC).toBeGreaterThanOrEqual(day.minC)
  })
})

// Real response captured from api.open-meteo.com during development (London).
const openMeteoLondon = {
  utc_offset_seconds: 0,
  current: {
    time: 1794572100,
    temperature_2m: 6.2,
    relative_humidity_2m: 55,
    apparent_temperature: 2.9,
    is_day: 1,
    weather_code: 0,
    wind_speed_10m: 1.7,
    wind_direction_10m: 324,
    pressure_msl: 1018.4,
    cloud_cover: 0,
    visibility: 16800,
  },
  daily: {
    time: [1794528000, 1794614400, 1794700800, 1794787200, 1794873600],
    weather_code: [0, 3, 61, 55, 53],
    temperature_2m_max: [7.0, 9.3, 12.5, 8.5, 12.2],
    temperature_2m_min: [1.8, 0.2, 4.9, 4.8, 4.8],
    sunrise: [1794554108, 1794640611, 1794727113, 1794813614, 1794900114],
    sunset: [1794586435, 1794672750, 1794759068, 1794845388, 1794931711],
    precipitation_probability_max: [0, 0, 96, 52, 63],
  },
}

describe('normalizeOpenMeteo', () => {
  const data = normalizeOpenMeteo(openMeteoLondon)

  it('maps current conditions and WMO codes', () => {
    expect(data.provider).toBe('open-meteo')
    expect(data.current).toMatchObject({ tempC: 6.2, feelsLikeC: 2.9, humidity: 55, condition: 'clear', isDay: true, visibilityM: 16800 })
    expect(data.current.sunrise).toBe(1794554108000)
  })

  it('maps five daily entries with real dates', () => {
    expect(data.daily.map((d) => d.date)).toEqual(['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17'])
    expect(data.daily[2]).toMatchObject({ condition: 'rain', maxC: 12.5, minC: 4.9, precipitationChance: 96 })
  })

  it('skips days with missing values instead of inventing them', () => {
    const withGap = {
      ...openMeteoLondon,
      daily: { ...openMeteoLondon.daily, temperature_2m_max: [7.0, null, 12.5, 8.5, 12.2] },
    }
    expect(normalizeOpenMeteo(withGap).daily).toHaveLength(4)
  })
})
