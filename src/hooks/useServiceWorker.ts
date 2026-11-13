import { useEffect, useState } from 'react'
import { registerServiceWorker } from '../services/serviceWorkerRegistration'

/** Registers the service worker and exposes a pending update, if any. */
export function useServiceWorker() {
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null)

  useEffect(() => registerServiceWorker((apply) => setApplyUpdate(() => apply)), [])

  return { updateReady: applyUpdate !== null, applyUpdate }
}
