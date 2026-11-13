import { describe, expect, it } from 'vitest'
import { validateCityQuery, validateReminderTime } from './validation'

describe('validateCityQuery', () => {
  it('rejects empty and whitespace-only input', () => {
    expect(validateCityQuery('')).toMatch(/enter a city/i)
    expect(validateCityQuery('   ')).toMatch(/enter a city/i)
  })

  it('requires a minimum length', () => {
    expect(validateCityQuery('L')).toMatch(/at least 2/i)
  })

  it('rejects digits and symbols', () => {
    expect(validateCityQuery('12345')).not.toBeNull()
    expect(validateCityQuery('Paris!')).not.toBeNull()
    expect(validateCityQuery('<script>')).not.toBeNull()
  })

  it('accepts real city names in many scripts and formats', () => {
    for (const name of ['London', 'São Paulo', 'Zürich', "Xi'an", 'St. John’s', 'Stratford-upon-Avon', '東京', 'Paris, France']) {
      expect(validateCityQuery(name)).toBeNull()
    }
  })
})

describe('validateReminderTime', () => {
  it('requires a value', () => {
    expect(validateReminderTime('')).not.toBeNull()
  })
  it('accepts 24-hour HH:MM', () => {
    expect(validateReminderTime('07:30')).toBeNull()
    expect(validateReminderTime('23:59')).toBeNull()
  })
  it('rejects malformed times', () => {
    expect(validateReminderTime('24:00')).not.toBeNull()
    expect(validateReminderTime('7:30')).not.toBeNull()
    expect(validateReminderTime('07:60')).not.toBeNull()
  })
})
