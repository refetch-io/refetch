import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ActionResult } from '@/lib/types'
import type { NotificationPage } from '@/lib/notifications'
import { isValidId } from '@/lib/url'
import {
  countUnreadNotifications,
  getEmailNotifications,
  listNotifications,
  markNotificationsRead,
  setEmailNotifications,
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
  async (): Promise<{ email: boolean } | null> => {
    const user = await getSessionUser()
    return user ? { email: await getEmailNotifications(user.id) } : null
  },
)

export const saveNotificationSettings = createServerFn({ method: 'POST' })
  .validator(z.object({ email: z.boolean() }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser()
    if (!user) return UNAUTHORIZED
    return setEmailNotifications(user.id, data.email)
  })
