import { describe, expect, it } from 'vitest'
import {
  countByDay,
  dayStarts,
  median,
  metricTallies,
  monthStarts,
  tally,
  threadIdFromPage,
  weekGrid,
} from './site-stats'

describe('monthStarts', () => {
  it('lists every month from the first to the current, across years', () => {
    const months = monthStarts(new Date('2025-11-20T10:00:00Z'), new Date('2026-02-03T00:00:00Z'))
    expect(months.map((date) => date.toISOString().slice(0, 7))).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ])
  })
})

describe('countByDay', () => {
  it('buckets dates by UTC day and ignores those outside the window', () => {
    const days = dayStarts(new Date('2026-10-30T15:00:00Z'), 3)
    expect(days[0].toISOString()).toBe('2026-10-28T00:00:00.000Z')
    const points = countByDay(
      ['2026-10-28T23:59:00Z', '2026-10-30T00:00:00Z', '2026-10-30T12:00:00Z', '2026-10-20T12:00:00Z'],
      days,
    )
    expect(points).toEqual([
      { label: '2026-10-28', visitors: 1 },
      { label: '2026-10-29', visitors: 0 },
      { label: '2026-10-30', visitors: 2 },
    ])
  })
})

describe('tally', () => {
  it('ranks values by count, then name, skipping empty ones', () => {
    expect(tally(['b', 'a', null, 'b', '', 'c', 'a', 'b'], 2)).toEqual([
      { label: 'b', count: 3 },
      { label: 'a', count: 2 },
    ])
  })
})

describe('metricTallies', () => {
  it('renames and merges rows, naming empty ones only when asked', () => {
    const rows = [
      { value: 'smartphone', visitors: 4 },
      { value: '', visitors: 9 },
      { value: 'desktop', visitors: 7 },
      { value: 'Smartphone', visitors: 1 },
    ]
    const rename = (value: string) => (value.toLowerCase() === 'smartphone' ? 'Phone' : 'Desktop')
    expect(metricTallies(rows, 5, { rename })).toEqual([
      { label: 'Desktop', count: 7 },
      { label: 'Phone', count: 5 },
    ])
    expect(metricTallies(rows, 1, { emptyLabel: 'Direct' })).toEqual([{ label: 'Direct', count: 9 }])
  })
})

describe('weekGrid', () => {
  it('folds hourly rows into weekdays (Monday first) by UTC hour', () => {
    const grid = weekGrid([
      { date: '2026-10-26T14:00:00.000+00:00', visitors: 3 }, // Monday
      { date: '2026-10-19T14:00:00.000+00:00', visitors: 2 }, // the Monday before
      { date: '2026-11-01T00:00:00.000+00:00', visitors: 5 }, // Sunday
    ])
    expect(grid).toHaveLength(7)
    expect(grid[0][14]).toBe(5)
    expect(grid[6][0]).toBe(5)
  })
})

describe('threadIdFromPage', () => {
  it('reads thread ids from page paths', () => {
    expect(threadIdFromPage('/threads/69096e60001d63885181')).toBe('69096e60001d63885181')
    expect(threadIdFromPage('/threads/abc/extra')).toBeNull()
    expect(threadIdFromPage('/channels/ai')).toBeNull()
  })
})

describe('median', () => {
  it('ignores a single spike', () => {
    expect(median([120, 3284, 110, 130])).toBe(125)
    expect(median([5, 1, 9])).toBe(5)
    expect(median([])).toBe(0)
  })
})
