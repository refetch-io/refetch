import { createFileRoute } from '@tanstack/react-router'
import { apiError, handleRouteError, json } from '@/lib/api/http.server'
import {
  createQuery,
  transformData,
  type DataType,
  type PlausibleQuery,
  type PlausibleResponse,
} from '@/lib/plausible.server'

const PLAUSIBLE_API_URL = 'https://plausible.io/api/v2/query'

const TTL_MS = {
  realtime: 30_000,
  '24h': 300_000,
  '30d': 1_800_000,
  '1y': 3_600_000,
} as const satisfies Record<DataType, number>

const analyticsCache: Partial<
  Record<
    DataType,
    {
      data: unknown
      timestamp: number
    }
  >
> = {}

function isDataType(value: string): value is DataType {
  return value === 'realtime' || value === '24h' || value === '30d' || value === '1y'
}

async function fetchAnalyticsData(dataType: DataType) {
  const apiKey = process.env.PLAUSIBLE_API_KEY
  const siteId = process.env.PLAUSIBLE_SITE_ID

  if (!apiKey || !siteId) {
    throw new Error(
      'Plausible configuration missing. Please configure PLAUSIBLE_API_KEY and PLAUSIBLE_SITE_ID.',
    )
  }

  const query: PlausibleQuery = createQuery(siteId, dataType)
  const response = await fetch(PLAUSIBLE_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
  }

  const result = (await response.json()) as PlausibleResponse & { error?: string }
  if (result.error) throw new Error(result.error)
  if (!result.results || !Array.isArray(result.results)) {
    throw new Error('Invalid response format from Plausible API')
  }

  return transformData(result, dataType)
}

export const Route = createFileRoute('/api/v1/analytics')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const typeParam = url.searchParams.get('type') || 'realtime'

          if (typeParam === 'config') {
            const apiKey = process.env.PLAUSIBLE_API_KEY
            const siteId = process.env.PLAUSIBLE_SITE_ID
            return json({
              configured: !!(apiKey && siteId),
              hasApiKey: !!apiKey,
              hasSiteId: !!siteId,
              timestamp: Date.now(),
            })
          }

          if (!isDataType(typeParam)) {
            return apiError(
              400,
              'Invalid data type. Supported types: realtime, 24h, 30d, 1y, config',
            )
          }

          const apiKey = process.env.PLAUSIBLE_API_KEY
          const siteId = process.env.PLAUSIBLE_SITE_ID
          if (!apiKey || !siteId) {
            return apiError(
              500,
              'Plausible configuration missing. Please configure PLAUSIBLE_API_KEY and PLAUSIBLE_SITE_ID.',
            )
          }

          const now = Date.now()
          const cached = analyticsCache[typeParam]
          if (cached && now - cached.timestamp < TTL_MS[typeParam]) {
            return json({
              data: cached.data,
              type: typeParam,
              cached: true,
              timestamp: cached.timestamp,
            })
          }

          try {
            const data = await fetchAnalyticsData(typeParam)
            analyticsCache[typeParam] = { data, timestamp: now }
            return json({
              data,
              type: typeParam,
              cached: false,
              timestamp: now,
            })
          } catch (error) {
            if (cached?.data !== undefined) {
              return json({
                data: cached.data,
                type: typeParam,
                cached: true,
                timestamp: cached.timestamp,
                error: 'Using cached data due to API error',
              })
            }
            throw error
          }
        } catch (error) {
          return handleRouteError(error)
        }
      },
    },
  },
})
