import { infiniteQueryOptions, keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { ChannelSort, FeedSort, VisitorRange } from './types'
import { fetchChannelDirectory, fetchChannelFeed, fetchFollowingFeed, searchRefetch } from '@/api/channels'
import { fetchFeed, fetchMyPosts, fetchThread } from '@/api/content'
import { fetchGitHubStars, fetchLiveVisitors, fetchTrendingTopics, fetchVisitorSeries } from '@/api/insights'
import { fetchPublicConfig, fetchSession } from '@/api/session'
import { fetchConversation, fetchInbox, fetchMessages, fetchUnreadCount } from '@/api/messages'
import {
  fetchOnboarding,
  fetchProfile,
  fetchFollowedIds,
  fetchProfileInsights,
  fetchWhoToFollow,
  fetchUserComments,
  fetchUserStories,
  findPeople,
} from '@/api/profiles'

/**
 * Query definitions shared by route loaders (SSR prefetch) and components.
 * User-specific data is keyed by user id so signing in/out never shows
 * someone else's votes.
 */

export const sessionQuery = () =>
  queryOptions({
    queryKey: ['session'],
    queryFn: () => fetchSession(),
    staleTime: Infinity,
  })

export const configQuery = () =>
  queryOptions({
    queryKey: ['config'],
    queryFn: () => fetchPublicConfig(),
    staleTime: Infinity,
    gcTime: Infinity,
  })

export const feedQuery = (sort: FeedSort, page: number, userId: string | null) =>
  queryOptions({
    queryKey: ['feed', sort, page, userId],
    queryFn: () => fetchFeed({ data: { sort, page } }),
    staleTime: 30_000,
  })

export const myPostsQuery = (page: number, userId: string | null) =>
  queryOptions({
    queryKey: ['mine', page, userId],
    queryFn: () => fetchMyPosts({ data: { page } }),
    staleTime: 15_000,
  })

export const threadQuery = (id: string, userId: string | null) =>
  queryOptions({
    queryKey: ['thread', id, userId],
    queryFn: () => fetchThread({ data: { id } }),
    staleTime: 15_000,
  })

export const liveVisitorsQuery = () =>
  queryOptions({
    queryKey: ['insights', 'live'],
    queryFn: () => fetchLiveVisitors(),
    staleTime: 25_000,
    refetchInterval: 30_000,
  })

export const visitorSeriesQuery = (range: VisitorRange) =>
  queryOptions({
    queryKey: ['insights', 'series', range],
    queryFn: () => fetchVisitorSeries({ data: { range } }),
    staleTime: 5 * 60_000,
  })

export const trendingTopicsQuery = () =>
  queryOptions({
    queryKey: ['insights', 'topics'],
    queryFn: () => fetchTrendingTopics(),
    staleTime: 5 * 60_000,
  })

export const githubStarsQuery = () =>
  queryOptions({
    queryKey: ['insights', 'stars'],
    queryFn: () => fetchGitHubStars(),
    staleTime: 60 * 60_000,
  })

export const channelDirectoryQuery = (userId: string | null) =>
  queryOptions({
    queryKey: ['channels', userId],
    queryFn: () => fetchChannelDirectory(),
    staleTime: 60_000,
  })

export const channelFeedQuery = (id: string, sort: ChannelSort, page: number, userId: string | null) =>
  queryOptions({
    queryKey: ['channel', id, sort, page, userId],
    queryFn: () => fetchChannelFeed({ data: { id, sort, page } }),
    staleTime: 30_000,
  })

export const followingQuery = (page: number, userId: string | null) =>
  queryOptions({
    queryKey: ['following', page, userId],
    queryFn: () => fetchFollowingFeed({ data: { page } }),
    staleTime: 30_000,
  })

export const searchQuery = (q: string) =>
  queryOptions({
    queryKey: ['search', q],
    queryFn: () => searchRefetch({ data: { q } }),
    staleTime: 60_000,
    enabled: q.trim().length >= 2,
    // Keep the last results on screen while the next keystroke is in flight.
    placeholderData: keepPreviousData,
  })

/* ─────────────────────────────── People ─────────────────────────────── */

export const profileQuery = (userId: string, viewerId: string | null) =>
  queryOptions({
    queryKey: ['profile', userId, viewerId],
    queryFn: () => fetchProfile({ data: { userId } }),
    staleTime: 30_000,
  })

export const profileInsightsQuery = (userId: string) =>
  queryOptions({
    queryKey: ['profile', userId, 'insights'],
    queryFn: () => fetchProfileInsights({ data: { userId } }),
    staleTime: 5 * 60_000,
  })

export const userStoriesQuery = (userId: string, page: number, viewerId: string | null) =>
  queryOptions({
    queryKey: ['profile', userId, 'stories', page, viewerId],
    queryFn: () => fetchUserStories({ data: { userId, page } }),
    staleTime: 30_000,
  })

export const userCommentsQuery = (userId: string, page: number) =>
  queryOptions({
    queryKey: ['profile', userId, 'comments', page],
    queryFn: () => fetchUserComments({ data: { userId, page } }),
    staleTime: 30_000,
  })

export const peopleQuery = (q: string) =>
  queryOptions({
    queryKey: ['people', q],
    queryFn: () => findPeople({ data: { q } }),
    staleTime: 60_000,
    enabled: q.trim().length >= 2,
    placeholderData: keepPreviousData,
  })

export const onboardingQuery = (userId: string) =>
  queryOptions({
    queryKey: ['onboarding', userId],
    queryFn: () => fetchOnboarding(),
    staleTime: 5 * 60_000,
  })

/* ────────────────────────────── Messages ────────────────────────────── */

/** Messages poll while open; there is no realtime socket with server-side sessions. */
export const MESSAGES_POLL_MS = 4_000
export const INBOX_POLL_MS = 15_000

export const inboxQuery = (userId: string) =>
  queryOptions({
    queryKey: ['inbox', userId],
    queryFn: () => fetchInbox(),
    staleTime: 5_000,
    refetchInterval: INBOX_POLL_MS,
  })

export const unreadQuery = (userId: string) =>
  queryOptions({
    queryKey: ['unread', userId],
    queryFn: () => fetchUnreadCount(),
    staleTime: 10_000,
    refetchInterval: 30_000,
  })

export const conversationQuery = (id: string, userId: string) =>
  queryOptions({
    queryKey: ['conversation', id, userId],
    queryFn: () => fetchConversation({ data: { id } }),
    staleTime: 5_000,
    refetchInterval: 15_000,
  })

export const messagesQuery = (id: string, userId: string) =>
  infiniteQueryOptions({
    queryKey: ['messages', id, userId],
    queryFn: ({ pageParam }) => fetchMessages({ data: { id, before: pageParam } }),
    initialPageParam: undefined as string | undefined,
    // Pages run newest → oldest; the next page starts before the oldest message.
    getNextPageParam: (last) => (last.hasMore ? last.messages[0]?.id : undefined),
    staleTime: 2_000,
    refetchInterval: MESSAGES_POLL_MS,
  })

export const whoToFollowQuery = (userId: string) =>
  queryOptions({
    queryKey: ['who-to-follow', userId],
    queryFn: () => fetchWhoToFollow(),
    staleTime: 10 * 60_000,
  })

export const followedIdsQuery = (userId: string) =>
  queryOptions({
    queryKey: ['followed', userId],
    queryFn: () => fetchFollowedIds(),
    staleTime: 60_000,
  })
