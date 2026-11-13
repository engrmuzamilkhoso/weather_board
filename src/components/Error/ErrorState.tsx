import { CloudAlert, RefreshCw, WifiOff } from 'lucide-react'
import './ErrorState.css'

interface ErrorStateProps {
  cityName: string | null
  message: string
  isOnline: boolean
  onRetry: () => void
}

export function ErrorState({ cityName, message, isOnline, onRetry }: ErrorStateProps) {
  const Icon = isOnline ? CloudAlert : WifiOff
  return (
    <section className="card error-state" role="alert">
      <span className="error-state__icon" aria-hidden>
        <Icon size={26} />
      </span>
      <h1 className="error-state__title">
        {isOnline ? `Couldn’t load weather${cityName ? ` for ${cityName}` : ''}` : 'You’re offline'}
      </h1>
      <p className="error-state__message">{message}</p>
      <div className="error-state__actions">
        <button type="button" className="btn btn--primary" onClick={onRetry} disabled={!isOnline}>
          <RefreshCw size={16} aria-hidden /> Try again
        </button>
      </div>
      {!isOnline && <p className="error-state__hint">We’ll retry automatically when your connection returns.</p>}
    </section>
  )
}
