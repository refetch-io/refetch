/*
 * Email digests: the best stories of the day or week, sent at 8 AM in each
 * reader's own time zone (daily) or on Monday at 8 AM (weekly). People pick
 * the frequency in Settings, and every digest links to a one-click unsubscribe.
 */

export type DigestFrequency = 'off' | 'daily' | 'weekly'

export const DIGEST_FREQUENCIES: ReadonlyArray<DigestFrequency> = ['off', 'daily', 'weekly']

/** What Refetch emails someone (Settings → Email). */
export interface EmailSettings {
  /** Replies, mentions, comments on your stories and new followers. */
  email: boolean
  digest: DigestFrequency
  /** IANA zone digests are timed to; null until the browser reports one. */
  timezone: string | null
}

/** Accounts that haven't chosen get the weekly digest (unless they turned email off). */
export const DEFAULT_DIGEST: DigestFrequency = 'weekly'
/** Local hour digests go out. */
export const DIGEST_HOUR = 8
/** Weekly digests go out on this local weekday (0 = Sunday, 1 = Monday). */
export const DIGEST_WEEKDAY = 1

const DAY_MS = 24 * 60 * 60 * 1000

export function isDigestFrequency(value: unknown): value is DigestFrequency {
  return typeof value === 'string' && (DIGEST_FREQUENCIES as ReadonlyArray<string>).includes(value)
}

/** The frequency a profile row stands for: its choice, or the default for its email setting. */
export function resolveDigest(stored: unknown, emailNotifications: unknown): DigestFrequency {
  if (isDigestFrequency(stored)) return stored
  return emailNotifications === false ? 'off' : DEFAULT_DIGEST
}

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

/** Milliseconds the zone is ahead of UTC at `time` (negative west of Greenwich). */
export function zoneOffset(time: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(time)
      .map((part) => [part.type, Number(part.value)]),
  )
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - Math.floor(time / 1000) * 1000
}

/** The UTC instant of a local wall-clock time in `timeZone`. */
function zonedTime(year: number, month: number, day: number, hour: number, timeZone: string): number {
  const guess = Date.UTC(year, month - 1, day, hour)
  const first = guess - zoneOffset(guess, timeZone)
  // Around a DST change the offset at the answer can differ from the guess's.
  return guess - zoneOffset(first, timeZone)
}

/** Local calendar date (and weekday) at `time` in `timeZone`. */
function localDate(time: number, timeZone: string) {
  const shifted = new Date(time + zoneOffset(time, timeZone))
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  }
}

/** When the next digest should go out after `now`, or null when digests are off. */
export function nextDigestAt(
  frequency: DigestFrequency,
  timeZone: string | null,
  now = Date.now(),
): Date | null {
  if (frequency === 'off') return null
  const zone = isTimeZone(timeZone) ? timeZone : 'UTC'
  const today = localDate(now, zone)
  for (let offset = 0; offset <= 8; offset++) {
    const date = new Date(Date.UTC(today.year, today.month - 1, today.day + offset))
    if (frequency === 'weekly' && date.getUTCDay() !== DIGEST_WEEKDAY) continue
    const at = zonedTime(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), DIGEST_HOUR, zone)
    if (at > now) return new Date(at)
  }
  // Unreachable: a week always has the weekday.
  return new Date(now + (frequency === 'weekly' ? 7 : 1) * DAY_MS)
}

/** How far back a digest looks. */
export function digestWindowMs(frequency: Exclude<DigestFrequency, 'off'>): number {
  return frequency === 'weekly' ? 7 * DAY_MS : DAY_MS
}

/** A digest more than this late is skipped (and rescheduled) rather than sent stale. */
export function maxLatenessMs(frequency: Exclude<DigestFrequency, 'off'>): number {
  return frequency === 'weekly' ? 2 * DAY_MS : 12 * 60 * 60 * 1000
}

/** "Mondays at 8 AM" / "every day at 8 AM", for settings. */
export function describeSchedule(frequency: DigestFrequency): string {
  const hour = `${DIGEST_HOUR % 12 || 12} ${DIGEST_HOUR < 12 ? 'AM' : 'PM'}`
  if (frequency === 'daily') return `Every morning at ${hour}`
  if (frequency === 'weekly') {
    const day = new Date(Date.UTC(2024, 0, 7 + DIGEST_WEEKDAY)).toLocaleDateString('en-US', {
      weekday: 'long',
      timeZone: 'UTC',
    })
    return `${day}s at ${hour}`
  }
  return 'Off'
}
