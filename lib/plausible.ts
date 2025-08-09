// Plausible Stats API v2 implementation based on official documentation
// https://plausible.io/docs/stats-api

export interface PlausibleQuery {
  site_id: string
  metrics: string[]
  date_range: string | [string, string]
  dimensions?: string[]
  filters?: any[]
  order_by?: [string, 'asc' | 'desc'][]
  include?: {
    imports?: boolean
    time_labels?: boolean
    total_rows?: boolean
  }
  pagination?: {
    limit: number
    offset: number
  }
}

export interface PlausibleResponse {
  results: Array<{
    metrics: (number | null)[]
    dimensions: (string | null)[]
  }>
  meta: {
    imports_included?: boolean
    imports_skip_reason?: string
    imports_warning?: string
    metric_warnings?: Record<string, any>
    time_labels?: string[]
    total_rows?: number
  }
  query: PlausibleQuery
}

export type DataType = 'realtime' | '24h' | '30d'

// Helper functions for date manipulation
function keyHour(d: Date): number {
  d.setMinutes(0, 0, 0)
  return d.getTime()
}

function keyDay(d: Date): number {
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function parseFlexible(ts: string | number): Date | null {
  if (typeof ts === 'number') {
    const d = new Date(ts)
    return isNaN(d.getTime()) ? null : d
  }
  
  // Try native parse first
  let d = new Date(ts)
  if (!isNaN(d.getTime())) return d
  
  // Try replacing space with 'T' to help some runtimes
  d = new Date(ts.replace(' ', 'T') + (ts.endsWith('Z') ? '' : 'Z'))
  if (!isNaN(d.getTime())) return d
  
  return null
}

// Transform Plausible API response based on data type
export function transformData(result: PlausibleResponse, dataType: DataType): any {
  if (dataType === 'realtime') {
    // For realtime, return total visitors for current day
    // Ensure minimum is 1 since the user viewing the page counts as at least 1 visitor
    const visitors = result.results?.[0]?.metrics?.[0] ?? 0
    return Math.max(visitors, 1)
  }

  if (dataType === '24h') {
    const labels: string[] | undefined = result.meta?.time_labels
    const rows: any[] = result.results ?? []

    if (labels?.length) {
      // Build value map from rows by HOUR key
      const valByHour = new Map<number, number>()
      for (const r of rows) {
        const dv = r.dimensions?.[0]
        const d = parseFlexible(dv)
        if (d) valByHour.set(keyHour(d), r.metrics?.[0] ?? 0)
      }
      
      // Produce series in label order, then fill 0..23
      const labeled = labels.map((iso) => {
        const d = parseFlexible(iso)
        if (!d) return { hour: 0, visitors: 0 }
        return { hour: d.getHours(), visitors: valByHour.get(keyHour(d)) ?? 0 }
      })
      
      // Ensure 0..23 present and ordered
      const filled = Array.from({ length: 24 }, (_, h) => {
        const found = labeled.find((x) => x.hour === h)
        return { hour: h, visitors: found?.visitors ?? 0 }
      })
      return filled
    }

    // Fallback without labels
    const hourMap = new Map<number, number>()
    for (const r of rows) {
      const d = parseFlexible(r.dimensions?.[0])
      if (d) hourMap.set(d.getHours(), r.metrics?.[0] ?? 0)
    }
    return Array.from({ length: 24 }, (_, h) => ({ 
      hour: h, 
      visitors: hourMap.get(h) ?? 0 
    }))
  }

  if (dataType === '30d') {
    const labels: string[] | undefined = result.meta?.time_labels
    const rows: any[] = result.results ?? []

    if (labels?.length) {
      const valByDay = new Map<number, number>()
      for (const r of rows) {
        const d = parseFlexible(r.dimensions?.[0])
        if (d) valByDay.set(keyDay(d), r.metrics?.[0] ?? 0)
      }
      
      const series = labels.slice(0, 30).map((iso, i) => {
        const d = parseFlexible(iso)
        if (!d) return { day: i + 1, visitors: 0 }
        return { day: d.getDate(), visitors: valByDay.get(keyDay(d)) ?? 0 }
      })
      
      // Guarantee 30 data points
      while (series.length < 30) {
        series.push({ day: series.length + 1, visitors: 0 })
      }
      return series
    }

    // Fallback without labels
    const series = rows.map((r: any, i: number) => {
      const d = parseFlexible(r.dimensions?.[0])
      return { day: d ? d.getDate() : i + 1, visitors: r.metrics?.[0] ?? 0 }
    })
    
    while (series.length < 30) {
      series.push({ day: series.length + 1, visitors: 0 })
    }
    return series.slice(0, 30)
  }

  return result.results ?? []
}

// Query builders for different data types
export function createRealtimeQuery(siteId: string): PlausibleQuery {
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
  
  return {
    site_id: siteId,
    metrics: ["visitors"],
    date_range: [fiveMinutesAgo.toISOString(), now.toISOString()],
    include: {
      time_labels: false,
      total_rows: false
    }
  }
}

export function create24hQuery(siteId: string): PlausibleQuery {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  
  return {
    site_id: siteId,
    metrics: ["visitors"],
    date_range: [yesterday.toISOString(), now.toISOString()],
    dimensions: ["time"],
    include: {
      time_labels: true,
      total_rows: false
    }
  }
}

export function create30dQuery(siteId: string): PlausibleQuery {
  return {
    site_id: siteId,
    metrics: ["visitors"],
    date_range: "30d",
    dimensions: ["time"],
    include: {
      time_labels: true,
      total_rows: false
    }
  }
}

// Generic query builder
export function createQuery(siteId: string, dataType: DataType): PlausibleQuery {
  switch (dataType) {
    case 'realtime':
      return createRealtimeQuery(siteId)
    case '24h':
      return create24hQuery(siteId)
    case '30d':
      return create30dQuery(siteId)
    default:
      throw new Error(`Unknown data type: ${dataType}`)
  }
}