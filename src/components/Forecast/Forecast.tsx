import { CalendarDays, Droplet } from 'lucide-react'
import type { ForecastDay } from '../../types/forecast'
import type { TemperatureUnit } from '../../types/weather'
import { cityDateKey, formatDayLabel, formatDayNumber } from '../../utils/dateUtils'
import { formatTemperature } from '../../utils/weatherUtils'
import { WeatherIcon } from '../WeatherIcon/WeatherIcon'
import './Forecast.css'

interface ForecastProps {
  days: ForecastDay[]
  unit: TemperatureUnit
  timezoneOffsetSec: number
  now: number
}

/**
 * Five calendar days in the city's timezone. Rows with a range bar on narrow
 * containers, tiles on wide ones (CSS container query — adapts to the card's
 * width, not the window's).
 */
export function Forecast({ days, unit, timezoneOffsetSec, now }: ForecastProps) {
  const todayKey = cityDateKey(now, timezoneOffsetSec)
  const lowest = Math.min(...days.map((d) => d.minC))
  const highest = Math.max(...days.map((d) => d.maxC))
  const span = Math.max(highest - lowest, 1)

  return (
    <section className="card forecast" aria-labelledby="forecast-title">
      <div className="card__header">
        <h2 id="forecast-title" className="card__title">
          <CalendarDays size={16} aria-hidden /> {days.length}-day forecast
        </h2>
      </div>
      {days.length === 0 ? (
        <p className="card__body forecast__empty">The forecast isn’t available for this location right now.</p>
      ) : (
        <ol className="card__body forecast__list">
          {days.map((day) => {
            const label = formatDayLabel(day.date, todayKey)
            return (
              <li key={day.date} className="forecast__day">
                <div className="forecast__when">
                  <span className="forecast__weekday" title={label.long}>
                    {label.short}
                  </span>
                  <span className="forecast__date">{formatDayNumber(day.date)}</span>
                </div>
                <WeatherIcon condition={day.condition} size={28} label={day.description} />
                <div className="forecast__cond">
                  <span>{day.description}</span>
                  {day.precipitationChance !== null && day.precipitationChance >= 20 && (
                    <span className="forecast__pop">
                      <Droplet size={12} aria-hidden />
                      <span className="visually-hidden">Chance of rain </span>
                      {day.precipitationChance}%
                    </span>
                  )}
                </div>
                <div className="forecast__temps tabular">
                  <span className="forecast__min">
                    <span className="visually-hidden">Low </span>
                    {formatTemperature(day.minC, unit)}
                  </span>
                  <span className="forecast__bar" aria-hidden>
                    <span
                      className="forecast__bar-fill"
                      style={{
                        left: `${((day.minC - lowest) / span) * 100}%`,
                        right: `${((highest - day.maxC) / span) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="forecast__max">
                    <span className="visually-hidden">High </span>
                    {formatTemperature(day.maxC, unit)}
                  </span>
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
