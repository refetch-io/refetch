import { createServerFn } from '@tanstack/react-start'
import { getCommunityStats, getTrafficStats } from '@/server/stats.server'

export const fetchCommunityStats = createServerFn({ method: 'GET' }).handler(() => getCommunityStats())

export const fetchTrafficStats = createServerFn({ method: 'GET' }).handler(() => getTrafficStats())
