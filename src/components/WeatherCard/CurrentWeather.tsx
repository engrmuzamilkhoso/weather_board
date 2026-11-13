import { Clock, Droplets, Star, Thermometer, Wind } from 'lucide-react'
import type { City } from '../../types/city'
import type { TemperatureUnit, WeatherData } from '../../types/weather'
import { formatCityDate, formatCityTime, formatUtcOffset } from '../../utils/dateUtils'
import { formatTemperature, formatWindSpeed, temperatureUnitLabel, windDirectionLabel } from '../../utils/weatherUtils'
import { WeatherIcon } from '../WeatherIcon/WeatherIcon'
import { WeatherStatus, type WeatherStatusProps } from './WeatherStatus'
import './CurrentWeather.css'

interface CurrentWeatherProps extends WeatherStatusProps {
  city: City
  data: WeatherData
  unit: TemperatureUnit
  now: number
  isFavorite: boolean
  onToggleFavorite: () => void
}

export function CurrentWeather({ city, data, unit, now, isFavorite, onToggleFavorite, ...status }: CurrentWeatherProps) {
  const { current } = data
  const today = data.daily[0]
  const offset = data.timezoneOffsetSec
  const tone = current.condition === 'clear' && !current.isDay ? 'night' : current.condition
  const place = [city.region, city.country].filter(Boolean).join(', ')

  return (
    <section className={`card hero hero--${tone}`} aria-labelledby="hero-city">
      <div className="hero__top">
        <div className="hero__place">
          <h1 id="hero-city" className="hero__city">
            {city.name}
          </h1>
          <p className="hero__region">{place}</p>
        </div>
        <button
          type="button"
          className={`icon-btn icon-btn--bordered hero__fav ${isFavorite ? 'is-active' : ''}`}
          aria-pressed={isFavorite}
          aria-label={isFavorite ? `Remove ${city.name} from favourites` : `Add ${city.name} to favourites`}
          title={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
          onClick={onToggleFavorite}
        >
          <Star size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <p className="hero__time">
        <Clock size={14} aria-hidden />
        <span>
          {formatCityDate(now, offset)} · <span className="tabular">{formatCityTime(now, offset)}</span> local time
        </span>
        <span className="hero__offset">{formatUtcOffset(offset)}</span>
      </p>

      <div className="hero__main">
        <WeatherIcon condition={current.condition} isDay={current.isDay} size={84} animated label={current.description} />
        <div className="hero__reading">
          <p className="hero__temp tabular">
            {formatTemperature(current.tempC, unit)}
            <span className="hero__unit">{temperatureUnitLabel(unit).slice(1)}</span>
          </p>
          <p className="hero__desc">{current.description}</p>
          {today && (
            <p className="hero__range tabular">
              <span>H {formatTemperature(today.maxC, unit)}</span>
              <span aria-hidden>·</span>
              <span>L {formatTemperature(today.minC, unit)}</span>
            </p>
          )}
        </div>
      </div>

      <dl className="hero__stats">
        <div className="hero__stat">
          <dt>
            <Thermometer size={15} aria-hidden /> Feels like
          </dt>
          <dd className="tabular">{formatTemperature(current.feelsLikeC, unit)}</dd>
        </div>
        <div className="hero__stat">
          <dt>
            <Droplets size={15} aria-hidden /> Humidity
          </dt>
          <dd className="tabular">{Math.round(current.humidity)}%</dd>
        </div>
        <div className="hero__stat">
          <dt>
            <Wind size={15} aria-hidden /> Wind
          </dt>
          <dd className="tabular">
            {formatWindSpeed(current.windSpeedMs, unit)}
            {current.windDeg !== null && <span className="hero__wind-dir"> {windDirectionLabel(current.windDeg)}</span>}
          </dd>
        </div>
      </dl>

      <WeatherStatus {...status} provider={data.provider} fetchedAt={data.fetchedAt} now={now} />
    </section>
  )
}
