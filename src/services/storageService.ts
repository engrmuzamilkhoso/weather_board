/**
 * localStorage wrapper that never throws.
 *
 * localStorage can be missing or throw on access (Safari private mode, storage
 * disabled by policy, sandboxed iframes) or on write (QuotaExceededError).
 * Every operation falls back to an in-memory Map so the app keeps working for
 * the session; `isPersistent()` lets the UI tell users their data won't
 * survive a reload.
 */

const memory = new Map<string, string>()
/** Keys whose latest value failed to persist; memory is the source of truth for them. */
const memoryOnly = new Set<string>()
let persistent: boolean | null = null

function getLocalStorage(): Storage | null {
  try {
    const storage = globalThis.localStorage
    if (!storage) return null
    const probe = '__weatherboard_probe__'
    storage.setItem(probe, probe)
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

export const storageService = {
  isPersistent(): boolean {
    if (persistent === null) persistent = getLocalStorage() !== null
    return persistent
  },

  /** Reads and validates JSON. Corrupt or unexpected data returns null instead of crashing. */
  get<T>(key: string, validate: (value: unknown) => value is T): T | null {
    let raw: string | null = memory.get(key) ?? null
    const storage = memoryOnly.has(key) ? null : getLocalStorage()
    if (storage) {
      try {
        raw = storage.getItem(key) ?? raw
      } catch {
        /* fall back to memory */
      }
    }
    if (raw === null) return null
    try {
      const parsed: unknown = JSON.parse(raw)
      return validate(parsed) ? parsed : null
    } catch {
      return null
    }
  },

  /** Returns true if the value was persisted, false if it only lives in memory. */
  set(key: string, value: unknown): boolean {
    const raw = JSON.stringify(value)
    memory.set(key, raw)
    const storage = getLocalStorage()
    if (!storage) {
      persistent = false
      memoryOnly.add(key)
      return false
    }
    try {
      storage.setItem(key, raw)
      memoryOnly.delete(key)
      return true
    } catch {
      persistent = false
      memoryOnly.add(key)
      return false
    }
  },

  remove(key: string): void {
    memory.delete(key)
    memoryOnly.delete(key)
    try {
      getLocalStorage()?.removeItem(key)
    } catch {
      /* ignore */
    }
  },
}

/** Test helper: reset module state between unit tests. */
export function __resetStorageForTests(): void {
  memory.clear()
  memoryOnly.clear()
  persistent = null
}
