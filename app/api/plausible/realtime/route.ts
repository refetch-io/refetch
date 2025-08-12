import { NextRequest, NextResponse } from 'next/server'
import { 
  createQuery, 
  transformData, 
  type DataType, 
  type PlausibleQuery,
  type PlausibleResponse 
} from '@/lib/plausible'

// Cache for different types of analytics data
let analyticsCache: {
  [key: string]: {
    data: any
    timestamp: number
    error: string | null
  }
} = {}

// TTL configurations for different data types (in milliseconds)
const TTL_CONFIG = {
  realtime: 30000,      // 30 seconds for real-time data
  '24h': 300000,        // 5 minutes for 24-hour data
  '30d': 1800000,       // 30 minutes for 30-day data
} as const

const PLAUSIBLE_API_URL = 'https://plausible.io/api/v2/query'

async function fetchAnalyticsData(dataType: DataType): Promise<any> {
  const apiKey = process.env.PLAUSIBLE_API_KEY
  const siteId = process.env.PLAUSIBLE_SITE_ID

  // If no API key or site ID, return mock data for development
  if (!apiKey || !siteId) {
    return generateMockData(dataType)
  }

  try {
    // Create proper query using the new Plausible implementation
    const query: PlausibleQuery = createQuery(siteId, dataType)



    const response = await fetch(PLAUSIBLE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(query)
    })



    if (!response.ok) {
      const errorText = await response.text()
      console.error(`=== PLAUSIBLE API ERROR ===`)
      console.error(`Response status: ${response.status} ${response.statusText}`)
      console.error(`Error body:`, errorText)
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
    }

    // Get the response text first for logging
    const responseText = await response.text()

    // Try to parse as JSON
    let result: any
    try {
      result = JSON.parse(responseText)

    } catch (parseError) {
      console.error(`=== JSON PARSE ERROR ===`)
      console.error(`Failed to parse response as JSON:`, parseError)
      console.error(`Response text:`, responseText)
      throw new Error(`Failed to parse response as JSON: ${parseError}`)
    }
    
    // Check for Plausible API errors
    if (result.error) {
      console.error(`=== PLAUSIBLE API ERROR IN RESPONSE ===`)
      console.error(`Error from Plausible:`, result.error)
      throw new Error(result.error)
    }
    
    // Type guard to ensure we have a valid PlausibleResponse
    if (!result.results || !Array.isArray(result.results)) {
      throw new Error('Invalid response format from Plausible API')
    }
    
    const plausibleResult: PlausibleResponse = result



    // Transform the data using the new implementation
    const transformedData = transformData(plausibleResult, dataType)
    

    
    return transformedData
  } catch (error) {
    console.error(`=== PLAUSIBLE API ERROR SUMMARY ===`)
    console.error(`Data type: ${dataType}`)
    console.error(`Error:`, error)
    console.error(`Error message:`, error instanceof Error ? error.message : 'Unknown error')
    console.error(`Error stack:`, error instanceof Error ? error.stack : 'No stack trace')
    throw error
  }
}

function generateMockData(dataType: DataType): any {
  switch (dataType) {
    case 'realtime':
      return Math.floor(Math.random() * 20) + 15 // 15-35 visitors
    case '24h':
      return Array.from({ length: 24 }, (_, i) => {
        const hour = i
        let baseVisitors = 30
        if (hour >= 9 && hour <= 17) baseVisitors = 60 // Work hours
        if (hour >= 19 && hour <= 22) baseVisitors = 45 // Evening
        if (hour >= 0 && hour <= 6) baseVisitors = 15 // Night
        
        const variation = (hour * 7 + 13) % 20
        return {
          hour: i,
          visitors: baseVisitors + variation
        }
      })
    case '30d':
      return Array.from({ length: 30 }, (_, i) => {
        const day = i + 1
        const dayOfWeek = day % 7
        let baseVisitors = 120
        if (dayOfWeek === 0 || dayOfWeek === 6) baseVisitors = 80 // Weekend
        if (dayOfWeek >= 1 && dayOfWeek <= 5) baseVisitors = 150 // Weekday
        
        const variation = (day * 11 + 17) % 50
        return {
          day: i + 1,
          visitors: baseVisitors + variation
        }
      })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dataType = searchParams.get('type') as DataType | 'config' || 'realtime'
    
    // Configuration check endpoint
    if (dataType === 'config') {
      const apiKey = process.env.PLAUSIBLE_API_KEY
      const siteId = process.env.PLAUSIBLE_SITE_ID
      
      return NextResponse.json({
        configured: !!(apiKey && siteId),
        hasApiKey: !!apiKey,
        hasSiteId: !!siteId,
        siteId: siteId ? `${siteId.substring(0, 8)}...` : null,
        timestamp: Date.now()
      })
    }
    
    // Validate data type
    if (!Object.keys(TTL_CONFIG).includes(dataType)) {
      return NextResponse.json(
        { error: 'Invalid data type. Supported types: realtime, 24h, 30d, config' },
        { status: 400 }
      )
    }

    // Check configuration
    const apiKey = process.env.PLAUSIBLE_API_KEY
    const siteId = process.env.PLAUSIBLE_SITE_ID
    
    if (!apiKey || !siteId) {
      console.warn(`Plausible configuration missing: API_KEY=${!!apiKey}, SITE_ID=${!!siteId}`)
      // Return mock data for development
      const mockData = generateMockData(dataType)
      return NextResponse.json({
        data: mockData,
        type: dataType,
        cached: false,
        timestamp: Date.now(),
        warning: 'Using mock data - Plausible configuration missing'
      })
    }

    const now = Date.now()
    const ttl = TTL_CONFIG[dataType]
    const cacheKey = dataType
    
    // Check if we have valid cached data
    if (analyticsCache[cacheKey] && 
        (now - analyticsCache[cacheKey].timestamp) < ttl) {
      return NextResponse.json({
        data: analyticsCache[cacheKey].data,
        type: dataType,
        cached: true,
        timestamp: analyticsCache[cacheKey].timestamp
      })
    }

    // Fetch fresh data
    const data = await fetchAnalyticsData(dataType)
    
    // Update cache
    analyticsCache[cacheKey] = {
      data,
      timestamp: now,
      error: null
    }

    return NextResponse.json({
      data,
      type: dataType,
      cached: false,
      timestamp: now
    })

  } catch (error) {
    console.error('Error in analytics API:', error)
    
    // Try to return cached data even if expired
    const dataType = new URL(request.url).searchParams.get('type') as DataType || 'realtime'
    const cacheKey = dataType
    
    if (analyticsCache[cacheKey]?.data !== undefined) {
      return NextResponse.json({
        data: analyticsCache[cacheKey].data,
        type: dataType,
        cached: true,
        timestamp: analyticsCache[cacheKey].timestamp,
        error: 'Using cached data due to API error'
      })
    }

    return NextResponse.json(
      { 
        error: 'Failed to fetch analytics data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
