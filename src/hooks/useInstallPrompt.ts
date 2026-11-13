import { useCallback, useEffect, useState } from 'react'

/**
 * Captures Chromium's `beforeinstallprompt` so we can offer our own Install
 * button instead of the browser's mini-infobar. Safari/Firefox never fire it,
 * in which case `canInstall` stays false and the button is hidden.
 */
export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault()
      setPromptEvent(event)
    }
    const onInstalled = () => setPromptEvent(null)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async (): Promise<boolean> => {
    if (!promptEvent) return false
    await promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    setPromptEvent(null) // a prompt event can only be used once
    return outcome === 'accepted'
  }, [promptEvent])

  return { canInstall: promptEvent !== null, install }
}
