import type { WeatherState } from '../../hooks/useWeather'
import type { City } from '../../types/city'
import type { TemperatureUnit } from '../../types/weather'
import { Welcome } from '../EmptyState/Welcome'
import { ErrorState } from '../Error/ErrorState'
import { Forecast } from '../Forecast/Forecast'
import { WeatherSkeleton } from '../Loading/WeatherSkeleton'
import { CurrentWeather } from '../WeatherCard/CurrentWeather'
import { WeatherDetails } from '../WeatherCard/WeatherDetails'

interface WeatherPanelProps {
  state: WeatherState
  unit: TemperatureUnit
  now: number
  isOnline: boolean
  isFavorite: (city: City) => boolean
  onToggleFavorite: (city: City) => void
  onRetry: () => void
  onSelectCity: (city: City) => void
}

/** Chooses the right view for each state: restoring / idle / loading / error / ready. */
export function WeatherPanel({ state, unit, now, isOnline, isFavorite, onToggleFavorite, onRetry, onSelectCity }: WeatherPanelProps) {
  switch (state.status) {
    case 'restoring':
      return <WeatherSkeleton />
    case 'idle':
      return <Welcome onSelect={onSelectCity} isOnline={isOnline} />
    case 'loading':
      return <WeatherSkeleton cityName={state.city?.name} />
    case 'error':
      return <ErrorState cityName={state.city?.name ?? null} message={state.error ?? ''} isOnline={isOnline} onRetry={onRetry} />
    case 'ready': {
      const { city, data } = state
      if (!city || !data) return null
      return (
        <>
          <CurrentWeather
            city={city}
            data={data}
            unit={unit}
            now={now}
            isFavorite={isFavorite(city)}
            onToggleFavorite={() => onToggleFavorite(city)}
            source={state.source}
            isOnline={isOnline}
            isRefreshing={state.isRefreshing}
            fallbackReason={state.fallbackReason}
            refreshError={state.refreshError}
            onRetry={onRetry}
          />
          <Forecast days={data.daily} unit={unit} timezoneOffsetSec={data.timezoneOffsetSec} now={now} />
          <WeatherDetails data={data} unit={unit} />
        </>
      )
    }
  }
}
