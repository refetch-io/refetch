import type { Tally, VisitorPoint } from './types'
import type { MetricRow } from './thread-stats'

/*
 * Pure helpers behind the /stats page, so the bucket and ranking rules can be
 * tested without the database or the analytics API.
 */

const DAY = 86_400_000

/** First instant of each UTC month from `since`'s month to `now`'s, oldest first. */
export function monthStarts(since: Date, now: Date): Array<Date> {
  const months: Array<Date> = []
  let year = since.getUTCFullYear()
  let month = since.getUTCMonth()
  const last = now.getUTCFullYear() * 12 + now.getUTCMonth()
  while (year * 12 + month <= last) {
    months.push(new Date(Date.UTC(year, month, 1)))
    month++
    if (month === 12) {
      month = 0
      year++
    }
  }
  return months
}

/** Midnight (UTC) of the last `count` days, today last. */
export function dayStarts(now: Date, count: number): Array<Date> {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Array.from({ length: count }, (_, i) => new Date(today - (count - 1 - i) * DAY))
}

/** Counts per day bucket (by `dayStarts`); dates outside the buckets are ignored. */
export function countByDay(dates: Array<string>, days: Array<Date>): Array<VisitorPoint> {
  const counts = new Map(days.map((day) => [day.getTime(), 0]))
  for (const iso of dates) {
    const time = new Date(iso).getTime()
    const day = time - (((time % DAY) + DAY) % DAY)
    if (counts.has(day)) counts.set(day, counts.get(day)! + 1)
  }
  return days.map((day) => ({ label: day.toISOString().slice(0, 10), visitors: counts.get(day.getTime())! }))
}

/** Most frequent values first (ties alphabetical), skipping empty ones. */
export function tally(values: Array<string | null | undefined>, limit: number): Array<Tally> {
  const counts = new Map<string, number>()
  for (const value of values) {
    if (!value) continue
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}

/** Analytics breakdown rows as tallies of visitors. Rows without a value are dropped unless named. */
export function metricTallies(
  rows: Array<MetricRow>,
  limit: number,
  options: { emptyLabel?: string; rename?: (value: string) => string } = {},
): Array<Tally> {
  const merged = new Map<string, number>()
  for (const row of rows) {
    const raw = row.value?.trim() ?? ''
    const label = raw ? (options.rename?.(raw) ?? raw) : options.emptyLabel
    const count = Number(row.visitors ?? 0) || 0
    if (!label || count <= 0) continue
    merged.set(label, (merged.get(label) ?? 0) + count)
  }
  return [...merged]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Hourly visitor rows folded into a week: seven rows (Monday first) of 24 UTC
 * hours. Each cell adds up every matching hour in the window.
 */
export function weekGrid(rows: Array<MetricRow>): Array<Array<number>> {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))
  for (const row of rows) {
    if (!row.date) continue
    const date = new Date(row.date)
    if (Number.isNaN(date.getTime())) continue
    const weekday = (date.getUTCDay() + 6) % 7
    grid[weekday][date.getUTCHours()] += Number(row.visitors ?? 0) || 0
  }
  return grid
}

/** Middle value (mean of the two middle ones for an even count); 0 when empty. */
export function median(values: Array<number>): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

/** "/threads/<id>" → "<id>", anything else → null. */
export function threadIdFromPage(page: string | null | undefined): string | null {
  const match = /^\/threads\/([A-Za-z0-9_-]{1,36})\/?$/.exec(page ?? '')
  return match ? match[1] : null
}
