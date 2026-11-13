import { afterEach, describe, expect, it, vi } from 'vitest'
import { isCityArray } from '../utils/guards'
import { __resetStorageForTests, storageService } from './storageService'

const city = { id: 'x', name: 'Oslo', region: null, country: 'Norway', countryCode: 'NO', latitude: 59.9, longitude: 10.7 }

function fakeStorage(overrides: Partial<Storage> = {}): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  __resetStorageForTests()
})

describe('storageService', () => {
  it('persists and validates JSON values', () => {
    vi.stubGlobal('localStorage', fakeStorage())
    expect(storageService.set('favs', [city])).toBe(true)
    expect(storageService.get('favs', isCityArray)).toEqual([city])
    expect(storageService.isPersistent()).toBe(true)
  })

  it('falls back to memory when localStorage throws (e.g. disabled / private mode)', () => {
    const throwing = () => {
      throw new DOMException('denied', 'SecurityError')
    }
    vi.stubGlobal('localStorage', fakeStorage({ setItem: throwing, getItem: throwing }))
    expect(storageService.set('favs', [city])).toBe(false)
    expect(storageService.get('favs', isCityArray)).toEqual([city])
    expect(storageService.isPersistent()).toBe(false)
  })

  it('keeps the newest value in memory when a write hits the quota', () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    storageService.set('favs', [])
    storage.setItem = (key: string) => {
      if (key !== '__weatherboard_probe__') throw new DOMException('full', 'QuotaExceededError')
    }
    expect(storageService.set('favs', [city])).toBe(false)
    expect(storageService.get('favs', isCityArray)).toEqual([city])
  })

  it('returns null for corrupted or unexpected data instead of throwing', () => {
    const storage = fakeStorage()
    vi.stubGlobal('localStorage', storage)
    storage.setItem('favs', '{not json')
    expect(storageService.get('favs', isCityArray)).toBeNull()
    storage.setItem('favs', JSON.stringify([{ name: 'missing fields' }]))
    expect(storageService.get('favs', isCityArray)).toBeNull()
  })
})
