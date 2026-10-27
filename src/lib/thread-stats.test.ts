import { describe, expect, it } from 'vitest'
import { DIRECT_SOURCE, THREAD_EVENTS, buildThreadStats, threadStatsWindow } from './thread-stats'

describe('threadStatsWindow', () => {
  it('charts young threads by the hour since posting', () => {
    const window = threadStatsWindow(new Date('2026-10-27T09:40:00Z'), new Date('2026-10-27T12:10:00Z'))
    expect(window.interval).toBe('1h')
    expect(window.startAt.toISOString()).toBe('2026-10-27T09:40:00.000Z')
    expect(window.buckets.map((date) => date.toISOString())).toEqual([
      '2026-10-27T09:00:00.000Z',
      '2026-10-27T10:00:00.000Z',
      '2026-10-27T11:00:00.000Z',
      '2026-10-27T12:00:00.000Z',
    ])
  })

  it('charts older threads by the day, at most 30 days back', () => {
    const now = new Date('2026-10-27T12:00:00Z')
    const recent = threadStatsWindow(new Date('2026-10-20T08:00:00Z'), now)
    expect(recent.interval).toBe('1d')
    expect(recent.buckets[0].toISOString()).toBe('2026-10-20T00:00:00.000Z')
    expect(recent.buckets.at(-1)?.toISOString()).toBe('2026-10-27T00:00:00.000Z')

    const old = threadStatsWindow(new Date('2025-01-01T00:00:00Z'), now)
    expect(old.buckets).toHaveLength(30)
    expect(old.buckets[0].toISOString()).toBe('2026-09-28T00:00:00.000Z')
    // Totals stop at a year back.
    expect(old.startAt.toISOString()).toBe('2025-10-27T12:00:00.000Z')
  })
})

describe('buildThreadStats', () => {
  const window = threadStatsWindow(new Date('2026-10-25T00:00:00Z'), new Date('2026-10-27T12:00:00Z'))

  it('combines events, unique viewers, the series and sources', () => {
    const stats = buildThreadStats({
      window,
      byEvent: [
        { value: 'pageview', events: 42 },
        { value: 'engagement_time', events: 30 },
        { value: THREAD_EVENTS.articleOpen, events: 9 },
        { value: 'outbound_link', events: 4 },
        { value: THREAD_EVENTS.share, events: 2 },
      ],
      byHostname: [
        { value: 'refetch.io', visitors: 30 },
        { value: 'www.refetch.io', visitors: 1 },
      ],
      series: [
        { date: '2026-10-26T00:00:00.000+00:00', pageviews: 12 },
        { date: '2026-10-27T00:00:00.000+00:00', pageviews: null, events: 5 },
      ],
      bySource: [
        { value: 'news.ycombinator.com', visitors: 4 },
        { value: '', visitors: 20 },
        { value: 'x.com', visitors: 0 },
        { value: 'reddit.com', visitors: 2 },
        { value: 'duckduckgo.com', visitors: 1 },
      ],
    })

    expect(stats).toMatchObject({ views: 42, visitors: 31, articleOpens: 9, shares: 2, interval: '1d' })
    expect(stats.points.map((point) => point.visitors)).toEqual([0, 12, 5])
    expect(stats.sources).toEqual([
      { label: DIRECT_SOURCE, visitors: 20 },
      { label: 'news.ycombinator.com', visitors: 4 },
      { label: 'reddit.com', visitors: 2 },
    ])
  })

  it('falls back to outbound-link events for article opens and zeros when empty', () => {
    const stats = buildThreadStats({
      window,
      byEvent: [{ value: 'outbound_link', events: 3 }],
      byHostname: [],
      series: [],
      bySource: [],
    })
    expect(stats).toMatchObject({ views: 0, visitors: 0, articleOpens: 3, shares: 0, sources: [] })
    expect(stats.points).toHaveLength(3)
  })
})
