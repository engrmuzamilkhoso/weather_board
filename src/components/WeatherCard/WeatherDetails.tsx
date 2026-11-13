import { Cloud, Eye, Gauge, Sunrise, Sunset, Umbrella, type LucideIcon } from 'lucide-react'
import type { TemperatureUnit, WeatherData } from '../../types/weather'
import { formatCityTime } from '../../utils/dateUtils'
import { formatVisibility } from '../../utils/weatherUtils'
import './WeatherDetails.css'

interface Metric {
  key: string
  icon: LucideIcon
  label: string
  value: string
}

/** Secondary metrics. Anything the provider didn't supply is omitted, never faked. */
export function WeatherDetails({ data, unit }: { data: WeatherData; unit: TemperatureUnit }) {
  const { current, timezoneOffsetSec: offset } = data
  const today = data.daily[0]

  const metrics: (Metric | null)[] = [
    current.sunrise !== null ? { key: 'sunrise', icon: Sunrise, label: 'Sunrise', value: formatCityTime(current.sunrise, offset) } : null,
    current.sunset !== null ? { key: 'sunset', icon: Sunset, label: 'Sunset', value: formatCityTime(current.sunset, offset) } : null,
    today?.precipitationChance != null
      ? { key: 'rain', icon: Umbrella, label: 'Chance of rain', value: `${today.precipitationChance}%` }
      : null,
    current.pressureHpa !== null
      ? {
          key: 'pressure',
          icon: Gauge,
          label: 'Pressure',
          value: unit === 'imperial' ? `${(current.pressureHpa * 0.02953).toFixed(2)} inHg` : `${Math.round(current.pressureHpa)} hPa`,
        }
      : null,
    current.visibilityM !== null ? { key: 'visibility', icon: Eye, label: 'Visibility', value: formatVisibility(current.visibilityM, unit) } : null,
    current.cloudCover !== null ? { key: 'clouds', icon: Cloud, label: 'Cloud cover', value: `${Math.round(current.cloudCover)}%` } : null,
  ]
  const visible = metrics.filter((m): m is Metric => m !== null)
  if (visible.length === 0) return null

  return (
    <section className="card" aria-labelledby="details-title">
      <div className="card__header">
        <h2 id="details-title" className="card__title">
          Today’s details
        </h2>
      </div>
      <dl className="card__body details">
        {visible.map(({ key, icon: Icon, label, value }) => (
          <div key={key} className="details__item">
            <span className="details__icon" aria-hidden>
              <Icon size={17} />
            </span>
            <div className="details__text">
              <dt>{label}</dt>
              <dd className="tabular">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  )
}
