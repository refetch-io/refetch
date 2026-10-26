import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import type {
  ActionResult,
  FeedPage,
  OnboardingSuggestions,
  PersonSummary,
  Profile,
  ProfileInsights,
  SuggestedPerson,
  UserCommentsPage,
} from '@/lib/types'
import { FEED_MAX_PAGES, LIMITS } from '@/lib/constants'
import { isHttpUrl, isValidId } from '@/lib/url'
import { isBotUser } from '@/lib/utils'
import { listUserPosts } from '@/server/posts.server'
import { joinChannel } from '@/server/channels.server'
import { getProfileInsights } from '@/server/people.server'
import {
  getFollowedIds,
  getOnboardingSuggestions,
  getWhoToFollow,
  getProfile,
  setFollowing,
  listUserComments,
  searchPeople,
  setBlocked,
  updateProfile,
} from '@/server/profiles.server'
import { getSessionUser, issueSession } from '@/server/session.server'

const userId = z.string().refine((value) => isValidId(value) || isBotUser(value), 'Invalid user')
const page = z.number().int().min(1).max(FEED_MAX_PAGES)
const UNAUTHORIZED = { ok: false, code: 'unauthorized', error: 'Please sign in to continue.' } as const

export const fetchProfile = createServerFn({ method: 'GET' })
  .validator(z.object({ userId: z.string().max(64) }))
  .handler(async ({ data }): Promise<Profile> => {
    if (!isValidId(data.userId) && !isBotUser(data.userId)) throw notFound()
    const viewer = await getSessionUser()
    const profile = await getProfile(data.userId, viewer)
    if (!profile) throw notFound()
    return profile
  })

export const fetchUserStories = createServerFn({ method: 'GET' })
  .validator(z.object({ userId, page }))
  .handler(async ({ data }): Promise<FeedPage> => {
    const viewer = await getSessionUser()
    return listUserPosts(data.userId, data.page, viewer?.id)
  })

export const fetchUserComments = createServerFn({ method: 'GET' })
  .validator(z.object({ userId, page }))
  .handler(({ data }): Promise<UserCommentsPage> => listUserComments(data.userId, data.page))

export const findPeople = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().max(64) }))
  .handler(async ({ data }): Promise<Array<PersonSummary>> => {
    const user = await getSessionUser()
    if (!user) return []
    return searchPeople(data.q, user.id)
  })

export const saveProfile = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      name: z.string().trim().min(1, 'Add your name.').max(LIMITS.nameMax),
      bio: z.string().max(LIMITS.bioMax),
      website: z
        .string()
        .trim()
        .max(LIMITS.websiteMax)
        .refine((value) => value === '' || isHttpUrl(value), 'Use a full link, like https://example.com.'),
      allowMessages: z.enum(['everyone', 'nobody']),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult<{ name: string }>> => {
    const user = await getSessionUser()
    if (!user) return UNAUTHORIZED
    const result = await updateProfile(user, data)
    // The session cookie carries the display name; keep it current.
    if (result.ok && result.data.name !== user.name) issueSession({ ...user, name: result.data.name })
    return result
  })

export const setUserBlocked = createServerFn({ method: 'POST' })
  .validator(z.object({ userId, blocked: z.boolean() }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    return setBlocked(user, data.userId, data.blocked)
  })

export const followUser = createServerFn({ method: 'POST' })
  .validator(z.object({ userId, follow: z.boolean() }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    return setFollowing(user, data.userId, data.follow)
  })

export const fetchOnboarding = createServerFn({ method: 'GET' }).handler(
  async (): Promise<OnboardingSuggestions | null> => {
    const user = await getSessionUser()
    return user ? getOnboardingSuggestions(user) : null
  },
)

/** Save the channels and people picked during onboarding in one go. */
export const completeOnboarding = createServerFn({ method: 'POST' })
  .validator(
    z.object({
      channelIds: z.array(z.string().regex(/^[a-z0-9-]{1,64}$/)).max(50),
      userIds: z.array(userId).max(50),
    }),
  )
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    const results = await Promise.allSettled([
      ...data.channelIds.map((id) => joinChannel(user, id)),
      ...data.userIds.map((id) => setFollowing(user, id, true)),
    ])
    const failed = results.filter((result) => result.status === 'rejected' || !result.value.ok).length
    return failed === 0
      ? { ok: true, data: undefined }
      : { ok: false, error: 'Some picks didn’t save. You can change them any time.' }
  })

export const fetchProfileInsights = createServerFn({ method: 'GET' })
  .validator(z.object({ userId }))
  .handler(({ data }): Promise<ProfileInsights> => getProfileInsights(data.userId))

export const fetchWhoToFollow = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<SuggestedPerson>> => {
    const user = await getSessionUser()
    return getWhoToFollow(user)
  },
)

/** IDs of everyone the signed-in person follows (for Follow buttons outside profiles). */
export const fetchFollowedIds = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Array<string>> => {
    const user = await getSessionUser()
    return user ? getFollowedIds(user.id) : []
  },
)
