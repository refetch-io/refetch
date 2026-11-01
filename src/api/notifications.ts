import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ActionResult } from '@/lib/types'
import type { NotificationPage } from '@/lib/notifications'
import { isValidId } from '@/lib/url'
import { DIGEST_FREQUENCIES, type DigestFrequency, type EmailSettings, isTimeZone } from '@/lib/digest'
import {
  getEmailSettings,
  unsubscribe,
  updateEmailSettings,
  verifyUnsubscribe,
} from '@/server/email-settings.server'
import {
  countUnreadNotifications,
  listNotifications,
  markNotificationsRead,
} from '@/server/notifications.server'
import { getSessionUser } from '@/server/session.server'

const id = z.string().refine(isValidId, 'Invalid id')
const UNAUTHORIZED = { ok: false, code: 'unauthorized', error: 'Please sign in to continue.' } as const

export const fetchNotifications = createServerFn({ method: 'GET' })
  .validator(z.object({ before: id.optional() }))
  .handler(async ({ data }): Promise<NotificationPage> => {
    const user = await getSessionUser()
    if (!user) return { notifications: [], nextCursor: null }
    return listNotifications(user.id, data.before)
  })

export const fetchNotificationCount = createServerFn({ method: 'GET' }).handler(async (): Promise<number> => {
  const user = await getSessionUser()
  return user ? countUnreadNotifications(user.id) : 0
})

/** Without ids, marks everything read. */
export const readNotifications = createServerFn({ method: 'POST' })
  .validator(z.object({ ids: z.array(id).max(100).optional() }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser()
    if (!user) return UNAUTHORIZED
    await markNotificationsRead(user.id, data.ids)
    return { ok: true, data: undefined }
  })

export const fetchNotificationSettings = createServerFn({ method: 'GET' }).handler(
  async (): Promise<EmailSettings | null> => {
    const user = await getSessionUser()
    return user ? getEmailSettings(user.id) : null
  },
)

export const saveNotificationSettings = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      email: z.boolean().optional(),
      digest: z.enum(DIGEST_FREQUENCIES as [DigestFrequency, ...Array<DigestFrequency>]).optional(),
      timezone: z.string().max(64).refine(isTimeZone, 'Unknown time zone').optional(),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult<EmailSettings>> => {
    const user = await getSessionUser()
    if (!user) return UNAUTHORIZED
    return updateEmailSettings(user.id, data)
  })

/* ─────────────────────────── Unsubscribe links (no sign-in) ─────────────────────────── */

const unsubscribeLink = z.object({
  u: id,
  l: z.enum(['digest', 'activity']),
  t: z.string().max(64),
})

export const fetchUnsubscribe = createServerFn({ method: 'GET' })
  .validator(unsubscribeLink)
  .handler(async ({ data }): Promise<EmailSettings | null> => {
    if (!verifyUnsubscribe(data.u, data.l, data.t)) return null
    return getEmailSettings(data.u)
  })

/** What the unsubscribe page's buttons do: turn the list off, back on, or change the digest. */
export const confirmUnsubscribe = createServerFn({ method: 'POST' })
  .validator(unsubscribeLink.extend({ action: z.enum(['unsubscribe', 'resubscribe', 'daily', 'weekly']) }))
  .handler(async ({ data }): Promise<ActionResult<EmailSettings>> => {
    if (!verifyUnsubscribe(data.u, data.l, data.t)) {
      return { ok: false, error: 'This link isn’t valid anymore. Change your emails in Settings instead.' }
    }
    switch (data.action) {
      case 'unsubscribe':
        return unsubscribe(data.u, data.l)
      case 'resubscribe':
        return updateEmailSettings(data.u, data.l === 'digest' ? { digest: 'weekly' } : { email: true })
      case 'daily':
      case 'weekly':
        return updateEmailSettings(data.u, { digest: data.action })
    }
  })
