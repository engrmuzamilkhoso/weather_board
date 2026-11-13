import { CloudOff, Info, Loader2, RefreshCw } from 'lucide-react'
import type { WeatherProvider } from '../../types/weather'
import { formatRelativeTime } from '../../utils/dateUtils'

export interface WeatherStatusProps {
  source: 'live' | 'cache'
  isOnline: boolean
  isRefreshing: boolean
  fallbackReason: string | null
  refreshError: string | null
  onRetry: () => void
}

const PROVIDER_NAMES: Record<WeatherProvider, string> = {
  openweathermap: 'OpenWeatherMap',
  'open-meteo': 'Open-Meteo',
}

/**
 * Data provenance footer: where the numbers came from and how fresh they are.
 * Cached data is always labelled as such — it is never presented as live.
 */
export function WeatherStatus({
  source,
  isOnline,
  isRefreshing,
  fallbackReason,
  refreshError,
  onRetry,
  provider,
  fetchedAt,
  now,
}: WeatherStatusProps & { provider: WeatherProvider; fetchedAt: number; now: number }) {
  const isStale = source === 'cache' || !isOnline
  const updated = formatRelativeTime(fetchedAt, now)

  return (
    <div className="hero__status">
      <div className="hero__status-row">
        {isRefreshing ? (
          <span className="pill">
            <Loader2 size={13} className="spin" aria-hidden /> Updating…
          </span>
        ) : isStale ? (
          <span className="pill pill--cached">
            <CloudOff size={13} aria-hidden /> Saved data
          </span>
        ) : (
          <span className="pill pill--live">
            <span className="pill__dot" aria-hidden /> Live
          </span>
        )}
        <span className="hero__source">
          {PROVIDER_NAMES[provider]} · updated {updated}
        </span>
        {isOnline && !isRefreshing && (
          <button type="button" className="btn btn--ghost btn--sm hero__refresh" onClick={onRetry} aria-label="Refresh weather">
            <RefreshCw size={14} aria-hidden />
            <span>Refresh</span>
          </button>
        )}
      </div>

      {isStale && !refreshError && (
        <p className="notice notice--warning">
          <CloudOff size={16} aria-hidden />
          <span className="notice__body">
            {isOnline
              ? `This is saved weather from ${updated} and may be out of date.`
              : `You’re offline — this is saved weather from ${updated} and may be out of date. It will refresh when you reconnect.`}
          </span>
        </p>
      )}

      {refreshError && (
        <div className="notice notice--warning" role="alert">
          <CloudOff size={16} aria-hidden />
          <span className="notice__body">
            <strong>Couldn’t refresh.</strong> {refreshError} Showing weather saved {updated}.
          </span>
          {isOnline && (
            <button type="button" className="btn btn--sm" onClick={onRetry}>
              Retry
            </button>
          )}
        </div>
      )}

      {fallbackReason && (
        <p className="notice notice--info">
          <Info size={16} aria-hidden />
          <span className="notice__body">{fallbackReason} This forecast comes from Open-Meteo instead.</span>
        </p>
      )}
    </div>
  )
}
