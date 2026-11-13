import { SEARCH_MIN_CHARS } from '../config/constants'

const CITY_MAX_CHARS = 85
/**
 * Letters from any script (São Paulo, Zürich, 東京, Xi'an, St. John's,
 * Stratford-upon-Avon) plus spaces, apostrophes, periods, hyphens, commas
 * and parentheses. Must start with a letter.
 */
const CITY_PATTERN = /^\p{L}[\p{L}\p{M}\s.'’,()-]*$/u

/** Returns an error message, or null when the query is valid. */
export function validateCityQuery(raw: string): string | null {
  const value = raw.trim()
  if (!value) return 'Enter a city name to search.'
  if (value.length < SEARCH_MIN_CHARS) return `Type at least ${SEARCH_MIN_CHARS} characters to search.`
  if (value.length > CITY_MAX_CHARS) return `City names are at most ${CITY_MAX_CHARS} characters.`
  if (!CITY_PATTERN.test(value)) {
    return 'City names can only contain letters, spaces, hyphens, apostrophes and periods.'
  }
  return null
}

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function validateReminderTime(value: string): string | null {
  if (!value) return 'Choose a time for your daily reminder.'
  if (!TIME_PATTERN.test(value)) return 'Enter a valid time, for example 07:30.'
  return null
}

/** "07:30" → minutes after midnight. Assumes the value passed validation. */
export function timeToMinutes(value: string): number {
  const [h = '0', m = '0'] = value.split(':')
  return Number(h) * 60 + Number(m)
}
