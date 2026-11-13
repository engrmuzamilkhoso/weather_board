import { describe, expect, it } from 'vitest'
import { aggregateThreeHourForecast, type ThreeHourSlot } from './forecastUtils'

const HOUR = 3600 * 1000

/** Builds 40 three-hour slots (like OWM /forecast) starting at `startUtc`. */
function slots(startUtc: number, tempAt: (i: number) => number): ThreeHourSlot[] {
  return Array.from({ length: 40 }, (_, i) => ({
    time: startUtc + i * 3 * HOUR,
    minC: tempAt(i),
    maxC: tempAt(i),
    condition: i % 8 === 4 ? 'rain' : 'clear',
    description: i % 8 === 4 ? 'Light rain' : 'Clear sky',
    pop: i === 10 ? 0.8 : 0.1,
  }))
}

describe('aggregateThreeHourForecast', () => {
  it('returns exactly five distinct calendar days starting today', () => {
    const now = Date.UTC(2026, 10, 13, 10, 0) // 10:00 UTC
    const result = aggregateThreeHourForecast(slots(now + 2 * HOUR, () => 10), 0, {
      time: now,
      tempC: 12,
      condition: 'clear',
      description: 'Clear sky',
    })
    expect(result.map((d) => d.date)).toEqual(['2026-11-13', '2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17'])
  })

  it('groups by the city’s local date, not UTC', () => {
    // 22:00 UTC is already the next day in UTC+5 (03:00).
    const now = Date.UTC(2026, 10, 13, 22, 0)
    const result = aggregateThreeHourForecast(slots(now + HOUR, () => 5), 5 * 3600, {
      time: now,
      tempC: 5,
      condition: 'clear',
      description: 'Clear sky',
    })
    expect(result[0]?.date).toBe('2026-11-14')
  })

  it('computes min/max per day and includes the current reading in today', () => {
    const now = Date.UTC(2026, 10, 13, 0, 30)
    const result = aggregateThreeHourForecast(slots(now + HOUR, (i) => i), 0, {
      time: now,
      tempC: -3,
      condition: 'clear',
      description: 'Clear sky',
    })
    expect(result[0]?.minC).toBe(-3)
    expect(result[0]?.maxC).toBe(7) // slots 0..7 fall on the first day
    expect(result[1]?.minC).toBe(8)
    expect(result[1]?.maxC).toBe(15)
  })

  it('uses the slot closest to local noon as the day’s condition', () => {
    const start = Date.UTC(2026, 10, 14, 0, 0)
    const result = aggregateThreeHourForecast(slots(start, () => 10), 0, {
      time: start - HOUR,
      tempC: 10,
      condition: 'clear',
      description: 'Clear sky',
    })
    // slot index 4 of each day = 12:00 → 'rain'
    expect(result[1]?.condition).toBe('rain')
    expect(result[1]?.description).toBe('Light rain')
  })

  it('reports the max precipitation probability as a percentage', () => {
    const start = Date.UTC(2026, 10, 14, 0, 0)
    const result = aggregateThreeHourForecast(slots(start, () => 10), 0, {
      time: start - HOUR,
      tempC: 10,
      condition: 'clear',
      description: 'Clear sky',
    })
    expect(result[2]?.precipitationChance).toBe(80) // slot 10 is on day 2 (2026-11-15)
  })
})
