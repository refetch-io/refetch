import type { ActionResult } from '@/lib/types'
import { type EmailSettings, isDigestFrequency, isTimeZone, nextDigestAt, resolveDigest } from '@/lib/digest'
import { isNotFound } from './appwrite.server'
import { db, type Row } from './db.server'
import { getSiteUrl } from './env.server'
import { signLink, verifyLink } from './session.server'

/*
 * What Refetch emails someone, stored on their profile row: activity emails
 * (`emailNotifications`), the digest (`digest`, `digestNextAt`) and the time
 * zone digests are timed to (`timezone`, picked up from the browser).
 */

export type { EmailSettings }

/** Separate lists, each with its own unsubscribe link. */
export type EmailList = 'digest' | 'activity'

export function isEmailList(value: unknown): value is EmailList {
  return value === 'digest' || value === 'activity'
}

export function toEmailSettings(row: Row | null): EmailSettings {
  return {
    email: row?.emailNotifications !== false,
    digest: resolveDigest(row?.digest, row?.emailNotifications),
    timezone: isTimeZone(row?.timezone) ? row.timezone : null,
  }
}

async function getProfileRow(userId: string): Promise<Row | null> {
  const { tables, ids } = db()
  return tables
    .getRow({ databaseId: ids.databaseId, tableId: ids.profiles, rowId: userId })
    .then((row) => row as Row)
    .catch((error: unknown) => {
      if (isNotFound(error)) return null
      throw error
    })
}

export async function getEmailSettings(userId: string): Promise<EmailSettings> {
  return toEmailSettings(await getProfileRow(userId).catch(() => null))
}

/** Change some settings; a new frequency or time zone reschedules the next digest. */
export async function updateEmailSettings(
  userId: string,
  patch: Partial<EmailSettings>,
): Promise<ActionResult<EmailSettings>> {
  const row = await getProfileRow(userId)
  if (!row) return { ok: false, error: 'We couldn’t find your Refetch account.' }
  const current = toEmailSettings(row)
  const next: EmailSettings = {
    email: patch.email ?? current.email,
    digest: isDigestFrequency(patch.digest) ? patch.digest : current.digest,
    timezone: isTimeZone(patch.timezone) ? patch.timezone : current.timezone,
  }

  const data: Record<string, unknown> = {}
  if (patch.email !== undefined) data.emailNotifications = next.email
  const digestChanged =
    (patch.digest !== undefined && (next.digest !== current.digest || row.digest !== next.digest)) ||
    (patch.timezone !== undefined && next.timezone !== current.timezone)
  if (digestChanged) {
    data.digest = next.digest
    data.timezone = next.timezone
    data.digestNextAt = nextDigestAt(next.digest, next.timezone)?.toISOString() ?? null
  }
  if (Object.keys(data).length === 0) return { ok: true, data: next }

  const { tables, ids } = db()
  try {
    await tables.updateRow({ databaseId: ids.databaseId, tableId: ids.profiles, rowId: userId, data })
  } catch (error) {
    if (error instanceof Error && /digest|timezone/i.test(error.message)) {
      console.warn('[email] profiles.digest is missing, run `npm run appwrite:setup`')
      return { ok: false, error: 'Digests aren’t set up yet. Please try again later.' }
    }
    throw error
  }
  return { ok: true, data: next }
}

/**
 * Remember the zone the browser reports at sign-in, so digests arrive in the
 * morning. A zone picked in Settings is never overwritten. Never throws.
 */
export async function rememberTimeZone(userId: string, timeZone: string | undefined) {
  if (!isTimeZone(timeZone)) return
  try {
    const row = await getProfileRow(userId)
    if (!row || isTimeZone(row.timezone)) return
    const { tables, ids } = db()
    const digest = resolveDigest(row.digest, row.emailNotifications)
    await tables.updateRow({
      databaseId: ids.databaseId,
      tableId: ids.profiles,
      rowId: userId,
      data: {
        timezone: timeZone,
        // Already scheduled in UTC: move the next digest to this zone's morning.
        ...(row.digestNextAt ? { digestNextAt: nextDigestAt(digest, timeZone)?.toISOString() ?? null } : {}),
      },
    })
  } catch (error) {
    // Usually the column isn't there yet (before `appwrite:setup`).
    console.warn('[email] could not store the time zone:', error instanceof Error ? error.message : error)
  }
}

/** Turn one list off, from an unsubscribe link. */
export function unsubscribe(userId: string, list: EmailList) {
  return updateEmailSettings(userId, list === 'digest' ? { digest: 'off' } : { email: false })
}

/* ──────────────────────────────── Links ──────────────────────────────── */

function linkPurpose(list: EmailList) {
  return `unsubscribe:${list}`
}

/** One-click unsubscribe from an email: works without signing in, for that person and list only. */
export function unsubscribeUrl(userId: string, list: EmailList): string {
  const params = new URLSearchParams({ u: userId, l: list, t: signLink(linkPurpose(list), userId) })
  return `${getSiteUrl()}/email/unsubscribe?${params}`
}

export function verifyUnsubscribe(userId: string, list: EmailList, token: string): boolean {
  return verifyLink(linkPurpose(list), userId, token)
}

export function settingsUrl(): string {
  return `${getSiteUrl()}/settings#email`
}
