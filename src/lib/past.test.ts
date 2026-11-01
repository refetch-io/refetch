import { describe, expect, it } from 'vitest'
import { dayRange, formatDay, isDay, isPastDay, shiftDay, yesterday } from './past'

describe('past days', () => {
  it('validates calendar days', () => {
    expect(isDay('2026-10-31')).toBe(true)
    expect(isDay('2026-02-30')).toBe(false)
    expect(isDay('2026-1-5')).toBe(false)
    expect(isDay('yesterday')).toBe(false)
  })

  it('only allows days between launch and today', () => {
    const now = new Date('2026-11-01T10:00:00Z').getTime()
    expect(isPastDay('2026-11-01', now)).toBe(true)
    expect(isPastDay('2026-11-02', now)).toBe(false)
    expect(isPastDay('2020-01-01', now)).toBe(false)
  })

  it('moves across months and years', () => {
    expect(shiftDay('2026-03-01', -1)).toBe('2026-02-28')
    expect(shiftDay('2026-12-31', 1)).toBe('2027-01-01')
    expect(yesterday(new Date('2026-11-01T00:30:00Z').getTime())).toBe('2026-10-31')
  })

  it('covers the whole UTC day', () => {
    expect(dayRange('2026-10-31')).toEqual({
      start: '2026-10-31T00:00:00.000Z',
      end: '2026-11-01T00:00:00.000Z',
    })
    expect(formatDay('2026-10-31')).toBe('Saturday, October 31, 2026')
    expect(formatDay('2026-10-31', false)).toBe('October 31, 2026')
  })
})
