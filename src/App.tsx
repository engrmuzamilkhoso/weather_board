import { useCallback, useEffect, useState } from 'react'
import { ConfirmDialog } from './components/ConfirmDialog/ConfirmDialog'
import { WeatherPanel } from './components/Dashboard/WeatherPanel'
import { FavouriteCities } from './components/FavouriteCities/FavouriteCities'
import { Header } from './components/Header/Header'
import { NotificationSettings } from './components/NotificationSettings/NotificationSettings'
import { OfflineBanner } from './components/OfflineBanner/OfflineBanner'
import { CitySearch } from './components/Search/CitySearch'
import { ThemeToggle } from './components/ThemeToggle/ThemeToggle'
import { useToast } from './components/Toast/toastContext'
import { UnitToggle } from './components/UnitToggle/UnitToggle'
import { MAX_FAVORITES } from './config/constants'
import { useFavorites } from './hooks/useFavorites'
import { useInstallPrompt } from './hooks/useInstallPrompt'
import { useNotifications } from './hooks/useNotifications'
import { useNow } from './hooks/useNow'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { useTemperatureUnit, useTheme } from './hooks/usePreferences'
import { useServiceWorker } from './hooks/useServiceWorker'
import { useWeather } from './hooks/useWeather'
import type { City } from './types/city'

/**
 * Composition root: wires hooks (state + side effects) to presentational
 * components. No fetching or business rules live here.
 */
export default function App() {
  const notify = useToast()
  const isOnline = useOnlineStatus()
  const now = useNow()
  const { theme, toggle: toggleTheme } = useTheme()
  const [unit, setUnit] = useTemperatureUnit()
  const { state: weather, loadCity, retry } = useWeather(isOnline)
  const favorites = useFavorites()
  const notifications = useNotifications(unit)
  const { canInstall, install } = useInstallPrompt()
  const { updateReady, applyUpdate } = useServiceWorker()
  const [pendingRemoval, setPendingRemoval] = useState<City | null>(null)

  useEffect(() => {
    if (updateReady && applyUpdate) {
      notify({ tone: 'info', message: 'A new version of WeatherBoard is ready.', action: { label: 'Reload', onClick: applyUpdate }, duration: 0 })
    }
  }, [updateReady, applyUpdate, notify])

  const selectCity = useCallback((city: City) => void loadCity(city), [loadCity])

  const toggleFavorite = useCallback(
    (city: City) => {
      if (favorites.isFavorite(city)) {
        setPendingRemoval(city) // removal always needs confirmation
        return
      }
      const result = favorites.add(city)
      if (result === 'added') notify({ tone: 'success', message: `${city.name} added to favourites.` })
      if (result === 'limit') {
        notify({ tone: 'error', message: `You can save up to ${MAX_FAVORITES} favourites. Remove one to add ${city.name}.` })
      }
    },
    [favorites, notify],
  )

  const confirmRemoval = () => {
    if (!pendingRemoval) return
    favorites.remove(pendingRemoval)
    notify({ tone: 'success', message: `${pendingRemoval.name} removed from favourites.` })
    setPendingRemoval(null)
  }

  const handleInstall = async () => {
    const accepted = await install()
    if (accepted) notify({ tone: 'success', message: 'WeatherBoard is installed. Open it from your home screen or app list.' })
  }

  return (
    <div className="app">
      <OfflineBanner isOnline={isOnline} savedAt={weather.data?.fetchedAt ?? null} />
      <Header
        search={<CitySearch onSelect={selectCity} />}
        controls={
          <>
            <UnitToggle unit={unit} onChange={setUnit} />
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </>
        }
        canInstall={canInstall}
        onInstall={handleInstall}
      />

      <main className="container layout">
        <div className="layout__main">
          <WeatherPanel
            state={weather}
            unit={unit}
            now={now}
            isOnline={isOnline}
            isFavorite={favorites.isFavorite}
            onToggleFavorite={toggleFavorite}
            onRetry={retry}
            onSelectCity={selectCity}
          />
        </div>
        <div className="layout__favourites">
          <FavouriteCities
            favorites={favorites.favorites}
            activeCity={weather.city}
            isPersistent={favorites.isPersistent}
            onSelect={selectCity}
            onRequestRemove={setPendingRemoval}
          />
        </div>
        <div className="layout__reminders">
          <NotificationSettings
            capabilities={notifications.capabilities}
            settings={notifications.settings}
            permission={notifications.permission}
            backgroundStatus={notifications.backgroundStatus}
            cityName={weather.city?.name ?? null}
            onEnable={notifications.enable}
            onDisable={notifications.disable}
            onUpdateTime={notifications.updateTime}
            onSendTest={notifications.sendTest}
            onToast={(tone, message) => notify({ tone, message })}
          />
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <span>
            Weather data from <a href="https://openweathermap.org/">OpenWeatherMap</a> and{' '}
            <a href="https://open-meteo.com/">Open-Meteo</a>. City search by{' '}
            <a href="https://rapidapi.com/wirefreethought/api/geodb-cities">GeoDB Cities</a>.
          </span>
          <span>WeatherBoard</span>
        </div>
      </footer>

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={`Remove ${pendingRemoval?.name ?? 'city'} from favourites?`}
        description="You can add it again at any time by searching for it and tapping the star."
        confirmLabel="Remove"
        onConfirm={confirmRemoval}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  )
}
