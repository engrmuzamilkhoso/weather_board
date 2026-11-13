import { Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { formatRelativeTime } from '../../utils/dateUtils'
import './OfflineBanner.css'

interface OfflineBannerProps {
  isOnline: boolean
  /** When the weather currently on screen was fetched, if any. */
  savedAt: number | null
}

/** Visible offline state, plus a brief "back online" confirmation on reconnect. */
export function OfflineBanner({ isOnline, savedAt }: OfflineBannerProps) {
  const [showReconnected, setShowReconnected] = useState(false)
  const [wasOffline, setWasOffline] = useState(!isOnline)

  // Derive "just reconnected" during render (no effect needed for the transition itself).
  if (!isOnline && !wasOffline) setWasOffline(true)
  if (isOnline && wasOffline) {
    setWasOffline(false)
    setShowReconnected(true)
  }

  useEffect(() => {
    if (!showReconnected) return
    const timer = setTimeout(() => setShowReconnected(false), 3000)
    return () => clearTimeout(timer)
  }, [showReconnected])

  if (isOnline && !showReconnected) return null

  return (
    <div className={`offline-banner ${isOnline ? 'offline-banner--back' : ''}`} role="status" aria-live="polite">
      <div className="container offline-banner__inner">
        {isOnline ? (
          <>
            <Wifi size={16} aria-hidden />
            <span>
              <strong>You’re back online.</strong> Refreshing weather…
            </span>
          </>
        ) : (
          <>
            <WifiOff size={16} aria-hidden />
            <span>
              <strong>You’re offline.</strong>{' '}
              {savedAt
                ? `Showing weather saved ${formatRelativeTime(savedAt)}. It may be out of date.`
                : 'Weather can’t be loaded until you reconnect.'}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
