/**
 * Registers /service-worker.js in production builds only. During `vite dev`
 * there's no build manifest and Vite's module graph changes constantly, so a
 * caching worker would only get in the way. Test PWA behaviour with
 * `npm run build && npm run preview`.
 *
 * Updates: a new worker installs in the background and waits. We tell the UI
 * (`onUpdateReady`); when the user clicks "Reload", the waiting worker is told
 * to skipWaiting, takes control, and the page reloads onto the new version.
 */
export function registerServiceWorker(onUpdateReady: (applyUpdate: () => void) => void): () => void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return () => {}

  let cancelled = false
  const hadController = navigator.serviceWorker.controller !== null
  let reloading = false

  const onControllerChange = () => {
    // First install also changes controller (clients.claim) — don't reload then.
    if (!hadController || reloading) return
    reloading = true
    window.location.reload()
  }
  navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

  const offerUpdate = (worker: ServiceWorker) => {
    if (!cancelled) onUpdateReady(() => worker.postMessage({ type: 'SKIP_WAITING' }))
  }

  navigator.serviceWorker
    .register('/service-worker.js', { scope: '/' })
    .then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) offerUpdate(registration.waiting)
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) offerUpdate(worker)
        })
      })
    })
    .catch((error: unknown) => {
      // The app still works without a worker — just without offline support.
      console.warn('Service worker registration failed; offline support is disabled.', error)
    })

  return () => {
    cancelled = true
    navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
  }
}
