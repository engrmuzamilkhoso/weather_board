/**
 * Browser APIs that TypeScript's DOM lib doesn't include yet.
 * All of them are feature-detected before use.
 */

/** Periodic Background Sync — Chromium only, installed PWAs only. */
interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>
  unregister(tag: string): Promise<void>
  getTags(): Promise<string[]>
}

interface ServiceWorkerRegistration {
  readonly periodicSync?: PeriodicSyncManager
}

/** Fired by Chromium when the app is installable. */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt(): Promise<void>
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface WindowEventMap {
  beforeinstallprompt: BeforeInstallPromptEvent
}

interface Navigator {
  /** iOS Safari home-screen web app flag. */
  readonly standalone?: boolean
}
