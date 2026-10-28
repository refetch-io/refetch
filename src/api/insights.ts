import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { isValidId } from '@/lib/url'
import {
  getGitHubStars,
  getLiveVisitors,
  getThreadStats,
  getTodayStats,
  getTrendingTopics,
  getVisitorSeries,
} from '@/server/insights.server'

export const fetchLiveVisitors = createServerFn({ method: 'GET' }).handler(() => getLiveVisitors())

export const fetchVisitorSeries = createServerFn({ method: 'GET' })
  .validator(z.object({ range: z.enum(['24h', '30d', '1y']) }))
  .handler(({ data }) => getVisitorSeries(data.range))

export const fetchThreadStats = createServerFn({ method: 'GET' })
  .validator(z.object({ postId: z.string().refine(isValidId, 'Invalid id') }))
  .handler(({ data }) => getThreadStats(data.postId))

export const fetchTrendingTopics = createServerFn({ method: 'GET' }).handler(() => getTrendingTopics())

export const fetchTodayStats = createServerFn({ method: 'GET' }).handler(() => getTodayStats())

export const fetchGitHubStars = createServerFn({ method: 'GET' }).handler(() => getGitHubStars())
