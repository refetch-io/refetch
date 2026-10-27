import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import type { ActionResult, Comment, FeedPage, PostDetail, Thread, VoteState } from '@/lib/types'
import { FEED_MAX_PAGES, LIMITS } from '@/lib/constants'
import { isHttpUrl, isValidId } from '@/lib/url'
import { createComment, editComment, removeComment } from '@/server/comments.server'
import {
  createPost,
  getPostById,
  getThread,
  listFeed,
  listUserPosts,
  removePost,
} from '@/server/posts.server'
import { getSessionUser } from '@/server/session.server'
import { castVote } from '@/server/votes.server'

const id = z.string().refine(isValidId, 'Invalid id')
const page = z.number().int().min(1).max(FEED_MAX_PAGES)

const UNAUTHORIZED = { ok: false, code: 'unauthorized', error: 'Please sign in to continue.' } as const

/* ──────────────────────────────────── Reads ──────────────────────────────────── */

export const fetchFeed = createServerFn({ method: 'GET' })
  .validator(z.object({ sort: z.enum(['top', 'new', 'show']), page }))
  .handler(async ({ data }): Promise<FeedPage> => {
    const user = await getSessionUser()
    return listFeed(data.sort, data.page, user?.id)
  })

export const fetchMyPosts = createServerFn({ method: 'GET' })
  .validator(z.object({ page }))
  .handler(async ({ data }): Promise<FeedPage | null> => {
    const user = await getSessionUser()
    if (!user) return null
    return listUserPosts(user.id, data.page)
  })

export const fetchThread = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().max(64) }))
  .handler(async ({ data }): Promise<Thread> => {
    if (!isValidId(data.id)) throw notFound()
    const user = await getSessionUser()
    const thread = await getThread(data.id, user?.id)
    if (!thread) throw notFound()
    return thread
  })

/** Just the story (no comments), for previews such as the join page. */
export const fetchStoryPreview = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().max(64) }))
  .handler(async ({ data }): Promise<PostDetail | null> => {
    if (!isValidId(data.id)) return null
    return getPostById(data.id)
  })

/* ────────────────────────────────── Mutations ────────────────────────────────── */

export const vote = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      resourceType: z.enum(['post', 'comment']),
      resourceId: id,
      direction: z.enum(['up', 'down']),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult<VoteState>> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    return castVote(user, data.resourceType, data.resourceId, data.direction)
  })

export const addComment = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      postId: id,
      content: z.string().trim().min(1, 'Write something first.').max(LIMITS.commentMax),
      replyId: id.optional(),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult<Comment>> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    return createComment(user, data)
  })

export const updateComment = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      id,
      content: z.string().trim().min(1, 'Write something first.').max(LIMITS.commentMax),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult<Comment>> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    return editComment(user, data.id, data.content)
  })

export const deleteComment = createServerFn({ method: 'POST' })
  .validator(z.object({ id }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    return removeComment(user, data.id)
  })

export const submitStory = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      title: z.string().trim().min(1, 'Add a title.').max(LIMITS.titleMax),
      url: z.string().trim().max(LIMITS.urlMax).refine(isHttpUrl, 'Enter a valid http(s) URL.'),
      comment: z.string().trim().max(LIMITS.submissionNoteMax).optional(),
      channel: z
        .string()
        .regex(/^[a-z0-9-]{1,64}$/)
        .optional(),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult<{ id: string }>> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    return createPost(user, data)
  })

export const deleteStory = createServerFn({ method: 'POST' })
  .validator(z.object({ id }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    return removePost(user, data.id)
  })
