import type { ThreadStats } from './types'

/*
 * Per-thread stats from Appwrite Analytics. Everything here is pure so the
 * window and bucket rules can be tested without the API.
 */

/** Analytics events recorded against a thread's own URL, so its stats count them wherever they happen. */
export const THREAD_EVENTS = {
  /** The story's article was opened, from a feed or from the thread. */
  articleOpen: 'article_open',
  /** The story was shared (copied link, native share sheet, or sent in messages). */
  share: 'story_share',
} as const

const HOUR = 3_600_000
const DAY = 24 * HOUR

/** Threads younger than this chart views by the hour. */
const HOURLY_UNTIL = 2 * DAY
/** Longest chart; totals still cover the whole life of the thread. */
const MAX_CHART_DAYS = 30
/** How far back totals look (analytics retention). */
const MAX_TOTAL_DAYS = 365

export interface ThreadStatsWindow {
  /** Start of the totals (posting time, or a year ago for older threads). */
  startAt: Date
  endAt: Date
  interval: '1h' | '1d'
  /** Bucket starts (UTC) for the chart, oldest first. */
  buckets: Array<Date>
}

const floorHour = (date: Date) => Math.floor(date.getTime() / HOUR) * HOUR
const floorDay = (date: Date) => Math.floor(date.getTime() / DAY) * DAY

export function threadStatsWindow(createdAt: Date, now: Date): ThreadStatsWindow {
  const startAt = new Date(Math.max(createdAt.getTime(), now.getTime() - MAX_TOTAL_DAYS * DAY))
  const age = now.getTime() - createdAt.getTime()

  if (age <= HOURLY_UNTIL) {
    const first = floorHour(createdAt)
    const last = floorHour(now)
    const count = Math.max(1, Math.round((last - first) / HOUR) + 1)
    return {
      startAt,
      endAt: now,
      interval: '1h',
      buckets: Array.from({ length: count }, (_, i) => new Date(first + i * HOUR)),
    }
  }

  const last = floorDay(now)
  const first = Math.max(floorDay(createdAt), last - (MAX_CHART_DAYS - 1) * DAY)
  const count = Math.round((last - first) / DAY) + 1
  return {
    startAt,
    endAt: now,
    interval: '1d',
    buckets: Array.from({ length: count }, (_, i) => new Date(first + i * DAY)),
  }
}

/** One row of the metrics endpoint (fields are null when they don't apply to the query). */
export interface MetricRow {
  value?: string | null
  date?: string | null
  visitors?: number | null
  pageviews?: number | null
  events?: number | null
  /** Only on totals (no dimension or interval). */
  visits?: number | null
  visitDuration?: number | null
  bounceRate?: number | null
  scrollDepth?: number | null
  viewsPerVisit?: number | null
}

export interface ThreadStatsRaw {
  window: ThreadStatsWindow
  /** Breakdown by event name, filtered to the thread's page. */
  byEvent: Array<MetricRow>
  /** Pageviews breakdown by hostname; its visitors add up to the thread's unique viewers. */
  byHostname: Array<MetricRow>
  /** Pageviews per bucket. */
  series: Array<MetricRow>
  /** Pageviews by referrer source. */
  bySource: Array<MetricRow>
}

const count = (value: number | null | undefined) => Number(value ?? 0) || 0

/** Shown for visits without a referrer. */
export const DIRECT_SOURCE = 'Direct'

export function buildThreadStats(raw: ThreadStatsRaw, sourceLimit = 3): ThreadStats {
  const events = new Map(raw.byEvent.map((row) => [row.value ?? '', count(row.events)]))
  const perBucket = new Map<number, number>()
  for (const row of raw.series) {
    if (!row.date) continue
    const time = new Date(row.date).getTime()
    perBucket.set(time, (perBucket.get(time) ?? 0) + count(row.pageviews ?? row.events))
  }

  return {
    views: events.get('pageview') ?? 0,
    visitors: raw.byHostname.reduce((sum, row) => sum + count(row.visitors), 0),
    // Before `article_open` existed, only the automatic outbound-link event saw these.
    articleOpens: Math.max(events.get(THREAD_EVENTS.articleOpen) ?? 0, events.get('outbound_link') ?? 0),
    shares: events.get(THREAD_EVENTS.share) ?? 0,
    interval: raw.window.interval,
    points: raw.window.buckets.map((start) => ({
      label: start.toISOString(),
      visitors: perBucket.get(start.getTime()) ?? 0,
    })),
    sources: raw.bySource
      .map((row) => ({ label: row.value?.trim() || DIRECT_SOURCE, visitors: count(row.visitors) }))
      .filter((source) => source.visitors > 0)
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, sourceLimit),
  }
}
