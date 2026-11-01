/*
 * The past front pages (`/past/2026-10-31`): the best stories posted on a day.
 * Days run midnight to midnight UTC, so every reader sees the same page.
 */

const DAY_MS = 24 * 60 * 60 * 1000

/** Refetch's first stories; there's nothing to show before this day. */
export const PAST_START = '2025-08-01'

const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/** `YYYY-MM-DD` for a moment, in UTC. */
export function toDay(time: number | Date): string {
  return new Date(time).toISOString().slice(0, 10)
}

/** Whether `day` is a real calendar day written as `YYYY-MM-DD`. */
export function isDay(day: string): boolean {
  const match = DAY.exec(day)
  if (!match) return false
  return toDay(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) === day
}

export function shiftDay(day: string, days: number): string {
  return toDay(new Date(`${day}T00:00:00.000Z`).getTime() + days * DAY_MS)
}

export function yesterday(now = Date.now()): string {
  return toDay(now - DAY_MS)
}

/** Days with a front page: from PAST_START through today. */
export function isPastDay(day: string, now = Date.now()): boolean {
  return isDay(day) && day >= PAST_START && day <= toDay(now)
}

/** The day as an ISO range for queries: [start, end). */
export function dayRange(day: string): { start: string; end: string } {
  const start = new Date(`${day}T00:00:00.000Z`)
  return { start: start.toISOString(), end: new Date(start.getTime() + DAY_MS).toISOString() }
}

/** "Saturday, October 31, 2026". */
export function formatDay(day: string, weekday = true): string {
  return new Date(`${day}T12:00:00.000Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    ...(weekday ? { weekday: 'long' as const } : {}),
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/** "Sat, Oct 31, 2026", for narrow screens. */
export function formatShortDay(day: string): string {
  return new Date(`${day}T12:00:00.000Z`).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
