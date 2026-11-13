import { useEffect, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from '../config/constants'
import { searchCities, searchErrorMessage } from '../services/geoService'
import { isAbortError } from '../services/http'
import type { City } from '../types/city'
import { validateCityQuery } from '../utils/validation'
import { useDebouncedValue } from './useDebouncedValue'

/** pending = debouncing or request in flight for the current query. */
export type SearchStatus = 'idle' | 'pending' | 'success' | 'empty' | 'error'

export interface CitySearchState {
  status: SearchStatus
  results: City[]
  error: string | null
  notice: string | null
  /** The query the current results belong to. */
  query: string
}

const IDLE: CitySearchState = { status: 'idle', results: [], error: null, notice: null, query: '' }

/**
 * Debounced autocomplete. Each new debounced query aborts the previous
 * request (AbortController), so a slow response for "Lon" can never overwrite
 * results for "London". Invalid queries never hit the network.
 */
export function useCitySearch(rawQuery: string): CitySearchState {
  const query = rawQuery.trim()
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const [state, setState] = useState<CitySearchState>(IDLE)

  const isValid = validateCityQuery(debouncedQuery) === null

  useEffect(() => {
    if (!isValid) return
    const controller = new AbortController()
    // No "loading" setState here: while `state.query` doesn't match the current
    // query, the hook derives status 'pending' below, so stale results never show.
    searchCities(debouncedQuery, controller.signal)
      .then(({ cities, notice }) => {
        setState({ status: cities.length ? 'success' : 'empty', results: cities, error: null, notice, query: debouncedQuery })
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) return
        setState({ status: 'error', results: [], error: searchErrorMessage(error), notice: null, query: debouncedQuery })
      })

    return () => controller.abort()
  }, [debouncedQuery, isValid])

  if (validateCityQuery(query) !== null) return IDLE
  // Still typing, or the request for this query hasn't answered yet.
  if (query !== debouncedQuery || state.query !== query) return { ...IDLE, status: 'pending', query }
  return state
}
