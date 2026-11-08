import { z } from 'zod'
import type { ActionResult } from '@/lib/types'
import { LIMITS } from '@/lib/constants'
import { isHttpUrl, isValidId } from '@/lib/url'

/*
 * The JSON API the mobile and desktop apps call (`/api/app/*`). The apps sign
 * in with Appwrite themselves and send a short-lived Appwrite JWT as a bearer
 * token; the routes verify it and then run the same server code the website's
 * server functions run, so the rules (rate limits, duplicates, counters,
 * notifications) live in one place.
 *
 * This file holds the framework-free parts so they can be unit tested.
 */

const id = z.string().refine(isValidId, 'Invalid id')

/** At most this many ids per type in one `/api/app/votes` lookup. */
export const MAX_VOTE_LOOKUP = 200

export const voteInput = z.object({
  resourceType: z.enum(['post', 'comment']),
  resourceId: id,
  direction: z.enum(['up', 'down']),
})

export const voteLookupInput = z.object({
  posts: z.array(id).max(MAX_VOTE_LOOKUP).default([]),
  comments: z.array(id).max(MAX_VOTE_LOOKUP).default([]),
})

export const commentInput = z.object({
  postId: id,
  content: z.string().trim().min(1, 'Write something first.').max(LIMITS.commentMax),
  replyId: id.optional(),
})

export const submitInput = z.object({
  title: z.string().trim().min(1, 'Add a title.').max(LIMITS.titleMax),
  url: z.string().trim().max(LIMITS.urlMax).refine(isHttpUrl, 'Enter a valid http(s) URL.'),
  comment: z.string().trim().max(LIMITS.submissionNoteMax).optional(),
})

/** The token from an `Authorization: Bearer <jwt>` header, or null. */
export function bearerToken(header: string | null | undefined): string | null {
  const match = /^Bearer\s+(\S+)$/i.exec(header?.trim() ?? '')
  const token = match?.[1]
  // Appwrite JWTs are well under 4 KB; anything else is not one.
  return token && token.length >= 16 && token.length <= 4096 ? token : null
}

/** HTTP status for a failed action, from its error code. */
export function statusForFailure(code: string | undefined): number {
  switch (code) {
    case 'unauthorized':
      return 401
    case 'rate_limited':
      return 429
    case 'duplicate':
      return 409
    default:
      return 400
  }
}

export interface AppApiBody<T> {
  status: number
  body: { data: T } | { error: string; code?: string; existingId?: string }
}

/** Map an ActionResult onto the app API's response shape. */
export function toAppResponse<T>(result: ActionResult<T>): AppApiBody<T> {
  if (result.ok) return { status: 200, body: { data: result.data } }
  return {
    status: statusForFailure(result.code),
    body: {
      error: result.error,
      ...(result.code ? { code: result.code } : {}),
      ...(result.existingId ? { existingId: result.existingId } : {}),
    },
  }
}

/** The first validation message, worded for people. */
export function validationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid request.'
}
