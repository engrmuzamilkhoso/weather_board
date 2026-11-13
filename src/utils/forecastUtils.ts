import type { ForecastDay } from '../types/forecast'
import type { WeatherCondition } from '../types/weather'
import { cityDateKey, cityHour } from './dateUtils'

export interface ThreeHourSlot {
  /** Epoch ms */
  time: number
  minC: number
  maxC: number
  condition: WeatherCondition
  description: string
  /** 0–1 probability of precipitation, if known */
  pop: number | null
}

export interface CurrentReading {
  time: number
  tempC: number
  condition: WeatherCondition
  description: string
}

/**
 * Turns OpenWeatherMap's 5-day / 3-hour forecast (40 rolling slots) into real
 * calendar days in the city's timezone.
 *
 * Pitfall this avoids: taking "every 8th item" or the first five records gives
 * five rolling 24h windows that straddle midnight, or several entries from the
 * same day. Instead we bucket by city-local date:
 *  - today = remaining slots today + the current observation
 *  - the next 4 days are fully covered by the 120h window
 *  - the representative condition is the slot closest to local noon
 *    (what people mean by "the weather on Tuesday")
 */
export function aggregateThreeHourForecast(
  slots: ThreeHourSlot[],
  offsetSec: number,
  current: CurrentReading,
  days = 5,
): ForecastDay[] {
  type Bucket = { min: number; max: number; pop: number | null; rep: ThreeHourSlot | CurrentReading; repDistance: number }
  const buckets = new Map<string, Bucket>()

  const consider = (time: number, minC: number, maxC: number, pop: number | null, rep: ThreeHourSlot | CurrentReading) => {
    const key = cityDateKey(time, offsetSec)
    const distance = Math.abs(cityHour(time, offsetSec) - 12)
    const bucket = buckets.get(key)
    if (!bucket) {
      buckets.set(key, { min: minC, max: maxC, pop, rep, repDistance: distance })
      return
    }
    bucket.min = Math.min(bucket.min, minC)
    bucket.max = Math.max(bucket.max, maxC)
    if (pop !== null) bucket.pop = Math.max(bucket.pop ?? 0, pop)
    if (distance < bucket.repDistance) {
      bucket.rep = rep
      bucket.repDistance = distance
    }
  }

  consider(current.time, current.tempC, current.tempC, null, current)
  for (const slot of slots) consider(slot.time, slot.minC, slot.maxC, slot.pop, slot)

  const todayKey = cityDateKey(current.time, offsetSec)
  return [...buckets.entries()]
    .filter(([key]) => key >= todayKey)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, days)
    .map(([date, b]) => ({
      date,
      minC: b.min,
      maxC: b.max,
      condition: b.rep.condition,
      description: b.rep.description,
      precipitationChance: b.pop === null ? null : Math.round(b.pop * 100),
    }))
}
