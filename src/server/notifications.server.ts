import { createHash } from 'node:crypto'
import { AppwriteException, ID } from 'node-appwrite'
import type { ActionResult, PersonSummary } from '@/lib/types'
import { renderNotificationEmail } from '@/lib/email'
import {
  excerpt,
  notificationHref,
  notificationSentence,
  type AppNotification,
  type NotificationPage,
  type NotificationType,
} from '@/lib/notifications'
import { isBotUser } from '@/lib/utils'
import { createAdminClient, isNotFound } from './appwrite.server'
import { Query, db, type Row } from './db.server'
import { getSiteUrl } from './env.server'
import { isBlocked } from './profiles.server'

/*
 * Notifications are rows in the `notifications` table, read by the bell in the
 * header (it polls, like the messages badge). Replies, comments and follows
 * are also emailed through Appwrite Messaging, using each account's email
 * target and whichever email provider (SMTP, Resend…) the project has set up.
 * With no provider the message simply fails in Messaging; the app never waits on it.
 */

const PAGE_SIZE = 30
/** Emailed types; milestones stay in the app. */
const EMAILED: ReadonlySet<NotificationType> = new Set(['comment', 'reply', 'follow'])
/** At most one email per person in this window, so a busy thread isn't an inbox flood. */
const EMAIL_COOLDOWN_MS = 10 * 60_000
const lastEmailAt = new Map<string, number>()

export interface NotifyInput {
  recipientId: string
  type: NotificationType
  actor: PersonSummary | null
  postId?: string
  postTitle?: string
  commentId?: string
  preview?: string
  /**
   * Stable key for events that should only ever notify once (a follow, a
   * milestone); a second notify with the same key is ignored.
   */
  dedupeKey?: string
}

function rowIdFor(dedupeKey: string | undefined) {
  if (!dedupeKey) return ID.unique()
  // Row IDs are at most 36 characters.
  return `n${createHash('sha256').update(dedupeKey).digest('hex').slice(0, 32)}`
}

/** Record a notification (and maybe email it). Never throws: the action that caused it already happened. */
export async function notify(input: NotifyInput): Promise<void> {
  const { recipientId, actor } = input
  if (!recipientId || isBotUser(recipientId) || recipientId === actor?.id) return
  try {
    if (actor && (await isBlocked(recipientId, actor.id))) return
    const { tables, ids } = db()
    await tables.createRow({
      databaseId: ids.databaseId,
      tableId: ids.notifications,
      rowId: rowIdFor(input.dedupeKey),
      data: {
        userId: recipientId,
        type: input.type,
        actorId: actor?.id ?? '',
        actorName: actor?.name ?? '',
        postId: input.postId ?? '',
        postTitle: (input.postTitle ?? '').slice(0, 300),
        commentId: input.commentId ?? '',
        preview: excerpt(input.preview ?? '', 280),
        read: false,
      },
    })
    if (EMAILED.has(input.type)) await sendEmail(input)
  } catch (error) {
    // 409: this event was already notified (dedupeKey).
    if (error instanceof AppwriteException && error.code === 409) return
    console.error('[notifications] failed to notify', error)
  }
}

async function wantsEmail(userId: string): Promise<boolean> {
  const { tables, ids } = db()
  const row = await tables
    .getRow({
      databaseId: ids.databaseId,
      tableId: ids.profiles,
      rowId: userId,
      queries: [Query.select(['$id', 'emailNotifications'])],
    })
    .catch(() => null)
  // On unless they turned it off (older profiles don't have the column set).
  return (row as Row | null)?.emailNotifications !== false
}

async function sendEmail(input: NotifyInput) {
  const now = Date.now()
  if (now - (lastEmailAt.get(input.recipientId) ?? 0) < EMAIL_COOLDOWN_MS) return
  if (!(await wantsEmail(input.recipientId))) return
  lastEmailAt.set(input.recipientId, now)

  const site = getSiteUrl()
  const headline = notificationSentence({
    type: input.type,
    actor: input.actor,
    postTitle: input.postTitle ?? null,
    preview: input.preview ?? '',
  })
  const path = notificationHref({
    type: input.type,
    actor: input.actor,
    postId: input.postId ?? null,
    commentId: input.commentId ?? null,
  })
  try {
    await createAdminClient().messaging.createEmail({
      messageId: ID.unique(),
      subject: headline,
      content: renderNotificationEmail({
        headline,
        quote: input.preview ? excerpt(input.preview, 400) : undefined,
        url: `${site}${path}`,
        action: input.type === 'follow' ? 'View profile' : 'Open the discussion',
        settingsUrl: `${site}/notifications`,
      }),
      users: [input.recipientId],
      html: true,
    })
  } catch (error) {
    // Usually a missing `messages.write` scope or no email provider yet.
    console.warn('[notifications] email not sent:', error instanceof Error ? error.message : error)
  }
}

/* ──────────────────────────────────── Reads ──────────────────────────────────── */

function toNotification(row: Row): AppNotification {
  const type = String(row.type) as NotificationType
  const actorId = typeof row.actorId === 'string' ? row.actorId : ''
  return {
    id: row.$id,
    type,
    actor: actorId ? { id: actorId, name: String(row.actorName || 'Refetch user') } : null,
    postId: typeof row.postId === 'string' && row.postId ? row.postId : null,
    postTitle: typeof row.postTitle === 'string' && row.postTitle ? row.postTitle : null,
    commentId: typeof row.commentId === 'string' && row.commentId ? row.commentId : null,
    preview: String(row.preview ?? ''),
    read: row.read === true,
    createdAt: row.$createdAt,
  }
}

export async function listNotifications(userId: string, before?: string): Promise<NotificationPage> {
  const { tables, ids } = db()
  const rows = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.notifications,
      queries: [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(PAGE_SIZE + 1),
        ...(before ? [Query.cursorAfter(before)] : []),
      ],
      total: false,
    })
    .then((result) => result.rows as Array<Row>)
    .catch((error: unknown) => {
      // The table is created by `appwrite:setup`; until then there's nothing to show.
      if (isNotFound(error)) return [] as Array<Row>
      throw error
    })
  const page = rows.slice(0, PAGE_SIZE)
  return {
    notifications: page.map(toNotification),
    nextCursor: rows.length > PAGE_SIZE ? (page.at(-1)?.$id ?? null) : null,
  }
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const { tables, ids } = db()
  return tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.notifications,
      queries: [Query.equal('userId', userId), Query.equal('read', false), Query.limit(1)],
      total: true,
    })
    .then((result) => result.total)
    .catch(() => 0)
}

/** Mark some (or all) of someone's notifications read. */
export async function markNotificationsRead(userId: string, notificationIds?: Array<string>) {
  const { tables, ids } = db()
  await tables.updateRows({
    databaseId: ids.databaseId,
    tableId: ids.notifications,
    data: { read: true },
    queries: [
      Query.equal('userId', userId),
      Query.equal('read', false),
      ...(notificationIds?.length ? [Query.equal('$id', notificationIds)] : []),
    ],
  })
}

/* ─────────────────────────────────── Settings ────────────────────────────────── */

export async function getEmailNotifications(userId: string): Promise<boolean> {
  return wantsEmail(userId)
}

export async function setEmailNotifications(userId: string, enabled: boolean): Promise<ActionResult> {
  const { tables, ids } = db()
  try {
    await tables.updateRow({
      databaseId: ids.databaseId,
      tableId: ids.profiles,
      rowId: userId,
      data: { emailNotifications: enabled },
    })
  } catch (error) {
    if (isNotFound(error)) return { ok: false, error: 'Sign out and back in, then try again.' }
    throw error
  }
  return { ok: true, data: undefined }
}
