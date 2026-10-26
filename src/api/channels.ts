import { createServerFn } from '@tanstack/react-start'
import { notFound } from '@tanstack/react-router'
import { z } from 'zod'
import type {
  ActionResult,
  Channel,
  ChannelAbout,
  ChannelDirectory,
  FeedPage,
  SearchResult,
} from '@/lib/types'
import { FEED_MAX_PAGES } from '@/lib/constants'
import {
  getChannel,
  getChannelAbout,
  getJoinedChannelIds,
  joinChannel,
  leaveChannel,
  listChannelFeed,
  listChannels,
  listFollowingFeed,
  searchStories,
} from '@/server/channels.server'
import { getSessionUser } from '@/server/session.server'

const channelId = z.string().regex(/^[a-z0-9-]{1,64}$/)
const page = z.number().int().min(1).max(FEED_MAX_PAGES)
const UNAUTHORIZED = { ok: false, code: 'unauthorized', error: 'Please sign in to join channels.' } as const

export const fetchChannelDirectory = createServerFn({ method: 'GET' }).handler(
  async (): Promise<ChannelDirectory> => {
    const user = await getSessionUser()
    const [channels, joined] = await Promise.all([
      listChannels(),
      user ? getJoinedChannelIds(user.id) : Promise.resolve([]),
    ])
    return { channels, joined }
  },
)

export const fetchChannelFeed = createServerFn({ method: 'GET' })
  .validator(z.object({ id: z.string().max(64), sort: z.enum(['hot', 'new']), page }))
  .handler(async ({ data }): Promise<{ channel: Channel; feed: FeedPage; about: ChannelAbout }> => {
    const channel = channelId.safeParse(data.id).success ? await getChannel(data.id) : null
    if (!channel) throw notFound()
    const user = await getSessionUser()
    const [feed, about] = await Promise.all([
      listChannelFeed(channel, data.sort, data.page, user?.id),
      getChannelAbout(channel),
    ])
    return { channel, feed, about }
  })

export const fetchFollowingFeed = createServerFn({ method: 'GET' })
  .validator(z.object({ page }))
  .handler(async ({ data }): Promise<(FeedPage & { joined: number }) | null> => {
    const user = await getSessionUser()
    if (!user) return null
    return listFollowingFeed(user, data.page)
  })

export const setChannelMembership = createServerFn({ method: 'POST' })
  .validator(z.object({ id: channelId, join: z.boolean() }))
  .handler(async ({ data }): Promise<ActionResult> => {
    const user = await getSessionUser({ fresh: true })
    if (!user) return UNAUTHORIZED
    return data.join ? joinChannel(user, data.id) : leaveChannel(user, data.id)
  })

export const searchRefetch = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string().max(120) }))
  .handler(async ({ data }): Promise<Array<SearchResult>> => searchStories(data.q))
