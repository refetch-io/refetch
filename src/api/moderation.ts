import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import type { ActionResult } from '@/lib/types'
import { REPORT_NOTE_MAX, REPORT_REASON_VALUES, type ModerationItem } from '@/lib/reports'
import { isValidId } from '@/lib/url'
import { countModerationQueue, createReport, listModerationQueue, resolveReports } from '@/server/reports.server'
import { getSessionUser } from '@/server/session.server'

const id = z.string().refine(isValidId, 'Invalid id')
const resourceType = z.enum(['post', 'comment'])
const UNAUTHORIZED = { ok: false, code: 'unauthorized', error: 'Please sign in to continue.' } as const

export const reportContent = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      resourceType,
      resourceId: id,
      reason: z.enum(REPORT_REASON_VALUES),
      note: z.string().trim().max(REPORT_NOTE_MAX).optional(),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    return createReport(user, data)
  })

/** The queue is only visible to moderators; everyone else gets a 404. */
export const fetchModerationQueue = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<ModerationItem>> => {
    const user = await getSessionUser()
    if (!user?.moderator) throw notFound()
    return listModerationQueue()
  },
)

/** How many items wait for review; 0 for everyone who isn't a moderator. */
export const fetchModerationCount = createServerFn({ method: 'GET' }).handler(async (): Promise<number> => {
  const user = await getSessionUser()
  return user?.moderator ? countModerationQueue() : 0
})

export const resolveReport =createServerFn({ method: 'POST' })
  .validator(z.object({ resourceType, resourceId: id, action: z.enum(['dismiss', 'remove']) }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    if (!user.moderator) return { ok: false, code: 'forbidden', error: 'Only moderators can do that.' }
    return resolveReports(user, data.resourceType, data.resourceId, data.action)
  })
