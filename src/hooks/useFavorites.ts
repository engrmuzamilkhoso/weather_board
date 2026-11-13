import { useCallback } from 'react'
import { MAX_FAVORITES, STORAGE_KEYS } from '../config/constants'
import { storageService } from '../services/storageService'
import type { City } from '../types/city'
import { isCityArray, isSameCity } from '../utils/guards'
import { useLocalStorage } from './useLocalStorage'

export type AddFavoriteResult = 'added' | 'duplicate' | 'limit'

const EMPTY: City[] = []

/**
 * Favourite cities: max 5, no duplicates, persisted to localStorage (or kept
 * in memory if storage is unavailable). Full City records incl. coordinates
 * are stored, so selecting a favourite fetches weather directly.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<City[]>(STORAGE_KEYS.favorites, EMPTY, isCityArray)

  const isFavorite = useCallback((city: City) => favorites.some((f) => isSameCity(f, city)), [favorites])

  const add = useCallback(
    (city: City): AddFavoriteResult => {
      if (favorites.some((f) => isSameCity(f, city))) return 'duplicate'
      if (favorites.length >= MAX_FAVORITES) return 'limit'
      const { id, name, region, country, countryCode, latitude, longitude } = city
      setFavorites([...favorites, { id, name, region, country, countryCode, latitude, longitude }])
      return 'added'
    },
    [favorites, setFavorites],
  )

  const remove = useCallback(
    (city: City) => setFavorites((current) => current.filter((f) => !isSameCity(f, city))),
    [setFavorites],
  )

  return {
    favorites,
    add,
    remove,
    isFavorite,
    isFull: favorites.length >= MAX_FAVORITES,
    isPersistent: storageService.isPersistent(),
  }
}
