import { useCallback, useEffect, useState } from 'react'
import { storageService } from '../services/storageService'

/**
 * useState that persists to localStorage via storageService (which never
 * throws and falls back to memory). Stored values are validated on read, so
 * corrupted/old data falls back to `initialValue` instead of crashing.
 * Also syncs across tabs through the `storage` event.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validate: (value: unknown) => value is T,
): [T, (next: T | ((previous: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => storageService.get(key, validate) ?? initialValue)

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      setValue((previous) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(previous) : next
        storageService.set(key, resolved)
        return resolved
      })
    },
    [key],
  )

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return
      const stored = storageService.get(key, validate)
      if (stored !== null) setValue(stored)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [key, validate])

  return [value, update]
}
