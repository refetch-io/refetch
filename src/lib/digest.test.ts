import { describe, expect, it } from 'vitest'
import { describeSchedule, isTimeZone, nextDigestAt, resolveDigest, zoneOffset } from './digest'

const at = (iso: string) => new Date(iso).getTime()

describe('resolveDigest', () => {
  it('keeps a choice and defaults to weekly unless email is off', () => {
    expect(resolveDigest('daily', true)).toBe('daily')
    expect(resolveDigest('off', undefined)).toBe('off')
    expect(resolveDigest(null, undefined)).toBe('weekly')
    expect(resolveDigest(null, false)).toBe('off')
    expect(resolveDigest('bogus', true)).toBe('weekly')
  })
})

describe('isTimeZone', () => {
  it('accepts IANA zones only', () => {
    expect(isTimeZone('Europe/Berlin')).toBe(true)
    expect(isTimeZone('UTC')).toBe(true)
    expect(isTimeZone('Mars/Olympus')).toBe(false)
    expect(isTimeZone('')).toBe(false)
    expect(isTimeZone(null)).toBe(false)
  })
})

describe('zoneOffset', () => {
  it('follows daylight saving time', () => {
    expect(zoneOffset(at('2026-01-15T12:00:00Z'), 'America/New_York')).toBe(-5 * 3600_000)
    expect(zoneOffset(at('2026-07-15T12:00:00Z'), 'America/New_York')).toBe(-4 * 3600_000)
    expect(zoneOffset(at('2026-07-15T12:00:00Z'), 'Asia/Kolkata')).toBe(5.5 * 3600_000)
  })
})

describe('nextDigestAt', () => {
  it('is off when digests are off', () => {
    expect(nextDigestAt('off', 'UTC', at('2026-11-01T00:00:00Z'))).toBeNull()
  })

  it('sends daily digests at 8 AM local time', () => {
    // 07:00 in Berlin (UTC+1 in November) → 08:00 the same day.
    expect(nextDigestAt('daily', 'Europe/Berlin', at('2026-11-02T06:00:00Z'))?.toISOString()).toBe(
      '2026-11-02T07:00:00.000Z',
    )
    // Just after 8 → tomorrow.
    expect(nextDigestAt('daily', 'Europe/Berlin', at('2026-11-02T07:00:01Z'))?.toISOString()).toBe(
      '2026-11-03T07:00:00.000Z',
    )
  })

  it('sends weekly digests on Monday at 8 AM local time', () => {
    // Sunday, November 1 2026 in New York → Monday, November 2, 08:00 EST.
    expect(nextDigestAt('weekly', 'America/New_York', at('2026-11-01T15:00:00Z'))?.toISOString()).toBe(
      '2026-11-02T13:00:00.000Z',
    )
    // Monday after 8 → next Monday.
    expect(nextDigestAt('weekly', 'America/New_York', at('2026-11-02T14:00:00Z'))?.toISOString()).toBe(
      '2026-11-09T13:00:00.000Z',
    )
  })

  it('stays at 8 AM across a daylight saving change', () => {
    // US clocks fall back on November 1, 2026: 8 AM is 12:00Z before, 13:00Z after.
    expect(nextDigestAt('daily', 'America/New_York', at('2026-10-31T13:00:00Z'))?.toISOString()).toBe(
      '2026-11-01T13:00:00.000Z',
    )
  })

  it('uses UTC when the zone is unknown', () => {
    expect(nextDigestAt('daily', null, at('2026-11-02T09:00:00Z'))?.toISOString()).toBe(
      '2026-11-03T08:00:00.000Z',
    )
  })
})

describe('describeSchedule', () => {
  it('reads naturally', () => {
    expect(describeSchedule('daily')).toBe('Every morning at 8 AM')
    expect(describeSchedule('weekly')).toBe('Mondays at 8 AM')
  })
})
