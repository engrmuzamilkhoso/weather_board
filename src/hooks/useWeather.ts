import { useCallback, useEffect, useReducer, useRef } from 'react'
import { isAbortError } from '../services/http'
import { loadSnapshot, saveSnapshot } from '../services/weatherCache'
import { getWeather, weatherErrorMessage } from '../services/weatherService'
import type { City } from '../types/city'
import type { WeatherData, WeatherSnapshot } from '../types/weather'
import { isSameCity } from '../utils/guards'

/** Refresh data automatically when the tab regains focus and it's older than this. */
const STALE_AFTER_MS = 15 * 60 * 1000

export interface WeatherState {
  /** idle = nothing selected yet; loading = no data to show for `city` yet. */
  status: 'restoring' | 'idle' | 'loading' | 'ready' | 'error'
  city: City | null
  data: WeatherData | null
  /** 'cache' = restored from the offline snapshot, not fetched in this session. */
  source: 'live' | 'cache'
  fallbackReason: string | null
  /** A background refresh is running while existing data stays visible. */
  isRefreshing: boolean
  /** Fatal error: there's nothing to show for `city`. */
  error: string | null
  /** A refresh failed but older data is still displayed. */
  refreshError: string | null
}

type Action =
  | { type: 'restored'; snapshot: WeatherSnapshot | null }
  | { type: 'request'; city: City }
  | { type: 'success'; city: City; data: WeatherData; fallbackReason: string | null }
  | { type: 'failure'; city: City; message: string; snapshot: WeatherSnapshot | null }

const initialState: WeatherState = {
  status: 'restoring',
  city: null,
  data: null,
  source: 'live',
  fallbackReason: null,
  isRefreshing: false,
  error: null,
  refreshError: null,
}

function reducer(state: WeatherState, action: Action): WeatherState {
  switch (action.type) {
    case 'restored':
      if (state.status !== 'restoring') return state // a search already happened
      return action.snapshot
        ? { ...initialState, status: 'ready', city: action.snapshot.city, data: action.snapshot.data, source: 'cache', fallbackReason: action.snapshot.fallbackReason }
        : { ...initialState, status: 'idle' }
    case 'request': {
      const sameCity = state.city !== null && isSameCity(state.city, action.city) && state.data !== null
      return sameCity
        ? { ...state, isRefreshing: true, refreshError: null }
        : { ...initialState, status: 'loading', city: action.city }
    }
    case 'success':
      return { ...initialState, status: 'ready', city: action.city, data: action.data, fallbackReason: action.fallbackReason }
    case 'failure': {
      // Keep showing what we have (current data or the saved snapshot), clearly labelled.
      if (state.data && state.city && isSameCity(state.city, action.city)) {
        return { ...state, isRefreshing: false, refreshError: action.message }
      }
      if (action.snapshot && isSameCity(action.snapshot.city, action.city)) {
        return {
          ...initialState,
          status: 'ready',
          city: action.snapshot.city,
          data: action.snapshot.data,
          source: 'cache',
          fallbackReason: action.snapshot.fallbackReason,
          refreshError: action.message,
        }
      }
      return { ...initialState, status: 'error', city: action.city, error: action.message }
    }
  }
}

/**
 * Owns the dashboard's weather lifecycle:
 *  - on start, shows the saved snapshot immediately, then refreshes if online
 *  - cancels in-flight requests when a new city is chosen
 *  - saves every successful result as the offline snapshot
 *  - on failure, falls back to the snapshot (labelled as cached) when it's the same city
 *  - refreshes automatically on reconnect and when stale data regains focus
 */
export function useWeather(isOnline: boolean) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const controllerRef = useRef<AbortController | null>(null)
  const stateRef = useRef(state)
  useEffect(() => {
    stateRef.current = state
  })

  const loadCity = useCallback(async (city: City) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    dispatch({ type: 'request', city })

    try {
      const { data, fallbackReason } = await getWeather(city, controller.signal)
      if (controller.signal.aborted) return
      dispatch({ type: 'success', city, data, fallbackReason })
      void saveSnapshot({ city, data, fallbackReason })
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return
      const snapshot = await loadSnapshot()
      if (controller.signal.aborted) return
      dispatch({ type: 'failure', city, message: weatherErrorMessage(error), snapshot })
    }
  }, [])

  const retry = useCallback(() => {
    const { city } = stateRef.current
    if (city) void loadCity(city)
  }, [loadCity])

  // Restore the last-viewed city on start.
  useEffect(() => {
    let cancelled = false
    void loadSnapshot().then((snapshot) => {
      if (cancelled) return
      dispatch({ type: 'restored', snapshot })
      if (snapshot && navigator.onLine) void loadCity(snapshot.city)
    })
    return () => {
      cancelled = true
    }
  }, [loadCity])

  // Refresh when connectivity returns.
  const wasOnline = useRef(isOnline)
  useEffect(() => {
    if (isOnline && !wasOnline.current) retry()
    wasOnline.current = isOnline
  }, [isOnline, retry])

  // Refresh stale data when the user comes back to the tab.
  useEffect(() => {
    const onVisible = () => {
      const { data, isRefreshing } = stateRef.current
      if (document.visibilityState === 'visible' && navigator.onLine && data && !isRefreshing && Date.now() - data.fetchedAt > STALE_AFTER_MS) {
        retry()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [retry])

  // Cancel any in-flight request on unmount.
  useEffect(() => () => controllerRef.current?.abort(), [])

  return { state, loadCity, retry }
}
