import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { ActionResult, FeedPage } from '@/lib/types'
import { FEED_MAX_PAGES } from '@/lib/constants'
import { isValidId } from '@/lib/url'
import { getSavedIds, listSavedPosts, setSaved } from '@/server/saves.server'
import { getSessionUser } from '@/server/session.server'

const UNAUTHORIZED = { ok: false, code: 'unauthorized', error: 'Please sign in to continue.' } as const

/** IDs of the stories the signed-in person saved (for bookmark states across the app). */
export const fetchSavedIds = createServerFn({ method: 'GET' }).handler(async (): Promise<Array<string>> => {
  const user = await getSessionUser()
  return user ? getSavedIds(user.id) : []
})

export const fetchSavedStories = createServerFn({ method: 'GET' })
  .validator(z.object({ page: z.number().int().min(1).max(FEED_MAX_PAGES) }))
  .handler(async ({ data }): Promise<FeedPage | null> => {
    const user = await getSessionUser()
    return user ? listSavedPosts(user.id, data.page) : null
  })

export const saveStory = createServerFn({ method: 'POST' })
  .validator(z.object({ postId: z.string().refine(isValidId, 'Invalid id'), saved: z.boolean() }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser()
    if (!user) return UNAUTHORIZED
    return setSaved(user, data.postId, data.saved)
  })
