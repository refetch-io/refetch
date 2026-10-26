import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
  getGitHubStars,
  getLiveVisitors,
  getTrendingTopics,
  getVisitorSeries,
} from '@/server/insights.server'

export const fetchLiveVisitors = createServerFn({ method: 'GET' }).handler(() => getLiveVisitors())

export const fetchVisitorSeries = createServerFn({ method: 'GET' })
  .validator(z.object({ range: z.enum(['24h', '30d', '1y']) }))
  .handler(({ data }) => getVisitorSeries(data.range))

export const fetchTrendingTopics = createServerFn({ method: 'GET' }).handler(() => getTrendingTopics())

export const fetchGitHubStars = createServerFn({ method: 'GET' }).handler(() => getGitHubStars())
