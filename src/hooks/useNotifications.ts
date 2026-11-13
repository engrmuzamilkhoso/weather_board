import { useCallback, useEffect, useRef, useState } from 'react'
import { REMINDER_GRACE_MINUTES, STORAGE_KEYS } from '../config/constants'
import {
  buildReminderContent,
  getCapabilities,
  getPermission,
  readReminderState,
  registerBackgroundReminder,
  requestPermission,
  showNotification,
  unregisterBackgroundReminder,
  writeReminderState,
  type BackgroundStatus,
  type NotificationAccess,
} from '../services/notificationService'
import { loadSnapshot } from '../services/weatherCache'
import { getWeather } from '../services/weatherService'
import type { TemperatureUnit } from '../types/weather'
import { localDateKey } from '../utils/dateUtils'
import { isRecord } from '../utils/guards'
import { timeToMinutes, validateReminderTime } from '../utils/validation'
import { useLocalStorage } from './useLocalStorage'

export interface ReminderSettings {
  enabled: boolean
  /** HH:MM, device-local time */
  time: string
  lastShownDate: string | null
}

const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, time: '07:30', lastShownDate: null }
const CHECK_INTERVAL_MS = 30_000

const isSettings = (value: unknown): value is ReminderSettings =>
  isRecord(value) && typeof value.enabled === 'boolean' && typeof value.time === 'string' && validateReminderTime(value.time) === null

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'denied' | 'dismissed' | 'invalid-time' | 'failed'; message: string }

/** Is `now` inside [reminder time, reminder time + grace]? */
function isDue(time: string, now: Date): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes()
  const due = timeToMinutes(time)
  return minutes >= due && minutes <= due + REMINDER_GRACE_MINUTES
}

/**
 * Daily reminder settings, permission flow and the in-page scheduler.
 * Permission is requested ONLY from `enable()`, i.e. after the user has read
 * the explanation and clicked "Turn on" — never on page load.
 */
export function useNotifications(unit: TemperatureUnit) {
  const [capabilities] = useState(getCapabilities) // static for the page's lifetime
  const [settings, setSettings] = useLocalStorage<ReminderSettings>(STORAGE_KEYS.reminder, DEFAULT_SETTINGS, isSettings)
  const [permission, setPermission] = useState<NotificationAccess>(getPermission)
  const [backgroundStatus, setBackgroundStatus] = useState<BackgroundStatus>('checking')
  const firingRef = useRef(false)

  // Users can change permission in browser settings at any time; re-check when they return.
  useEffect(() => {
    const refresh = () => setPermission(getPermission())
    document.addEventListener('visibilitychange', refresh)
    let watched: PermissionStatus | null = null
    let disposed = false
    navigator.permissions
      ?.query({ name: 'notifications' })
      .then((result) => {
        if (disposed) return
        watched = result
        result.addEventListener('change', refresh)
      })
      .catch(() => {
        /* Permissions API can't watch notifications here — visibilitychange still covers it. */
      })
    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', refresh)
      watched?.removeEventListener('change', refresh)
    }
  }, [])

  // Work out how reminders can be delivered when the app is closed.
  useEffect(() => {
    let cancelled = false
    const check = settings.enabled && permission === 'granted' ? registerBackgroundReminder() : Promise.resolve<BackgroundStatus>(capabilities.periodicSync ? 'needs-install' : 'unsupported')
    void check.then((status) => {
      if (!cancelled) setBackgroundStatus(status)
    })
    return () => {
      cancelled = true
    }
  }, [settings.enabled, permission, capabilities.periodicSync])

  // Keep the worker's copy of the settings in sync (it can't read localStorage).
  useEffect(() => {
    void writeReminderState({ enabled: settings.enabled, time: settings.time, unit })
  }, [settings.enabled, settings.time, unit])

  /** Shows today's reminder. Fetches fresh weather; falls back to the saved snapshot (labelled). */
  const fireReminder = useCallback(
    async (isTest: boolean) => {
      const snapshot = await loadSnapshot()
      if (!snapshot) {
        await showNotification('WeatherBoard', {
          body: 'Search for a city in WeatherBoard and your daily forecast will appear here.',
          tag: 'weatherboard-daily',
        })
        return
      }
      let content = buildReminderContent(snapshot, unit, false)
      try {
        const { data } = await getWeather(snapshot.city)
        content = buildReminderContent({ ...snapshot, data }, unit, true)
      } catch {
        /* keep the snapshot content — it says how old it is */
      }
      await showNotification(isTest ? `Test · ${content.title}` : content.title, {
        body: content.body,
        tag: 'weatherboard-daily',
        data: { url: '/' },
      })
    },
    [unit],
  )

  // In-page scheduler: runs while any WeatherBoard tab is open (even in the background).
  useEffect(() => {
    if (!settings.enabled || permission !== 'granted') return

    const check = async () => {
      const now = new Date()
      const today = localDateKey(now)
      if (firingRef.current || !isDue(settings.time, now) || settings.lastShownDate === today) return
      // The service worker may have already shown today's reminder.
      const shared = await readReminderState()
      if (shared?.lastShownDate === today) return
      firingRef.current = true
      try {
        await fireReminder(false)
        setSettings((s) => ({ ...s, lastShownDate: today }))
        await writeReminderState({ lastShownDate: today })
      } catch {
        /* permission revoked mid-session — the permission listener will update the UI */
      } finally {
        firingRef.current = false
      }
    }

    void check()
    const timer = setInterval(() => void check(), CHECK_INTERVAL_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', check)
    }
  }, [settings.enabled, settings.time, settings.lastShownDate, permission, fireReminder, setSettings])

  const enable = useCallback(
    async (time: string): Promise<EnableResult> => {
      const timeError = validateReminderTime(time)
      if (timeError) return { ok: false, reason: 'invalid-time', message: timeError }
      if (!capabilities.notifications) {
        return { ok: false, reason: 'unsupported', message: 'This browser doesn’t support notifications.' }
      }

      let result = getPermission()
      if (result === 'default') result = await requestPermission()
      setPermission(result)

      if (result === 'denied') {
        return {
          ok: false,
          reason: 'denied',
          message: 'Notifications are blocked for this site. Allow them in your browser’s site settings, then try again.',
        }
      }
      if (result !== 'granted') {
        return {
          ok: false,
          reason: 'dismissed',
          message: 'You closed the permission prompt, so reminders are still off. Turn them on again whenever you’re ready.',
        }
      }
      setSettings((s) => ({ ...s, enabled: true, time }))
      return { ok: true }
    },
    [capabilities.notifications, setSettings],
  )

  const disable = useCallback(async () => {
    setSettings((s) => ({ ...s, enabled: false }))
    await unregisterBackgroundReminder()
  }, [setSettings])

  const updateTime = useCallback((time: string) => setSettings((s) => ({ ...s, time })), [setSettings])

  const sendTest = useCallback(async (): Promise<string | null> => {
    try {
      await fireReminder(true)
      return null
    } catch {
      return 'The test notification couldn’t be shown. Check that notifications are allowed for this site.'
    }
  }, [fireReminder])

  return { capabilities, settings, permission, backgroundStatus, enable, disable, updateTime, sendTest }
}
