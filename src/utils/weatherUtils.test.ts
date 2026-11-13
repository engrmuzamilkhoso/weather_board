import { describe, expect, it } from 'vitest'
import {
  celsiusToFahrenheit,
  conditionFromOpenWeatherId,
  formatTemperature,
  formatWindSpeed,
  fromWmoCode,
  windDirectionLabel,
} from './weatherUtils'

describe('temperature conversion', () => {
  it('uses F = C × 9/5 + 32', () => {
    expect(celsiusToFahrenheit(0)).toBe(32)
    expect(celsiusToFahrenheit(100)).toBe(212)
    expect(celsiusToFahrenheit(-40)).toBe(-40)
  })

  it('formats rounded values in either unit and never shows -0', () => {
    expect(formatTemperature(21.6, 'metric')).toBe('22°')
    expect(formatTemperature(21.6, 'imperial')).toBe('71°')
    expect(formatTemperature(-0.3, 'metric')).toBe('0°')
  })

  it('converts wind speed for display', () => {
    expect(formatWindSpeed(10, 'metric')).toBe('36 km/h')
    expect(formatWindSpeed(10, 'imperial')).toBe('22 mph')
  })
})

describe('condition mapping', () => {
  it('maps OpenWeatherMap ids', () => {
    expect(conditionFromOpenWeatherId(211)).toBe('thunderstorm')
    expect(conditionFromOpenWeatherId(301)).toBe('drizzle')
    expect(conditionFromOpenWeatherId(500)).toBe('rain')
    expect(conditionFromOpenWeatherId(511)).toBe('snow')
    expect(conditionFromOpenWeatherId(741)).toBe('fog')
    expect(conditionFromOpenWeatherId(800)).toBe('clear')
    expect(conditionFromOpenWeatherId(802)).toBe('partly-cloudy')
    expect(conditionFromOpenWeatherId(804)).toBe('cloudy')
  })

  it('maps WMO codes from Open-Meteo, with a safe default', () => {
    expect(fromWmoCode(0)).toEqual({ condition: 'clear', description: 'Clear sky' })
    expect(fromWmoCode(63).condition).toBe('rain')
    expect(fromWmoCode(75).condition).toBe('snow')
    expect(fromWmoCode(99).condition).toBe('thunderstorm')
    expect(fromWmoCode(1234).description).toBe('Unknown conditions')
  })

  it('labels wind direction', () => {
    expect(windDirectionLabel(0)).toBe('N')
    expect(windDirectionLabel(225)).toBe('SW')
    expect(windDirectionLabel(359)).toBe('N')
  })
})
