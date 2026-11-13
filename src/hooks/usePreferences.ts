import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { STORAGE_KEYS } from '../config/constants'
import type { TemperatureUnit } from '../types/weather'
import { useLocalStorage } from './useLocalStorage'

export type Theme = 'light' | 'dark'

const isStoredTheme = (value: unknown): value is Theme | null => value === null || value === 'light' || value === 'dark'
const isUnit = (value: unknown): value is TemperatureUnit => value === 'metric' || value === 'imperial'

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')
function subscribeToScheme(onChange: () => void) {
  const query = darkQuery()
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

const THEME_COLORS: Record<Theme, string> = { light: '#f6f7f9', dark: '#0e1116' }

/**
 * Theme: follows the OS until the user picks one; the explicit choice is
 * persisted. (index.html applies it before first paint to avoid a flash.)
 */
export function useTheme() {
  const [stored, setStored] = useLocalStorage<Theme | null>(STORAGE_KEYS.theme, null, isStoredTheme)
  const systemDark = useSyncExternalStore(subscribeToScheme, () => darkQuery().matches, () => false)
  const theme: Theme = stored ?? (systemDark ? 'dark' : 'light')

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
  }, [theme])

  const toggle = useCallback(() => setStored(theme === 'dark' ? 'light' : 'dark'), [theme, setStored])
  return { theme, toggle }
}

/** °C / °F — display-only, persisted. Changing it never refetches. */
export function useTemperatureUnit() {
  return useLocalStorage<TemperatureUnit>(STORAGE_KEYS.unit, 'metric', isUnit)
}
