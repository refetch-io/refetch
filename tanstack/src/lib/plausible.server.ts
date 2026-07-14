// Plausible Stats API v2 - https://plausible.io/docs/stats-api

export interface PlausibleQuery {
  site_id: string
  metrics: string[]
  date_range: string | [string, string]
  dimensions?: string[]
  filters?: unknown[]
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
    metric_warnings?: Record<string, unknown>
    time_labels?: string[]
    total_rows?: number
  }
  query: PlausibleQuery
}

export type DataType = 'realtime' | '24h' | '30d' | '1y'

function keyDay(d: Date): number {
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function parseFlexible(ts: string | number | null | undefined): Date | null {
  if (ts == null) return null
  if (typeof ts === 'number') {
    const d = new Date(ts)
    return Number.isNaN(d.getTime()) ? null : d
  }

  let d = new Date(ts)
  if (!Number.isNaN(d.getTime())) return d

  d = new Date(ts.replace(' ', 'T') + (ts.endsWith('Z') ? '' : 'Z'))
  if (!Number.isNaN(d.getTime())) return d

  return null
}

export function transformData(result: PlausibleResponse, dataType: DataType) {
  if (dataType === 'realtime') {
    const visitors = result.results?.[0]?.metrics?.[0] ?? 0
    return Math.max(visitors, 1)
  }

  if (dataType === '24h') {
    const labels = result.meta?.time_labels
    const rows = result.results ?? []

    if (labels?.length) {
      const valByHour = new Map<number, number>()
      for (const r of rows) {
        const d = parseFlexible(r.dimensions?.[0] ?? undefined)
        if (d) valByHour.set(d.getHours(), r.metrics?.[0] ?? 0)
      }

      const labeled = labels.map((iso) => {
        const d = parseFlexible(iso)
        if (!d) return { hour: 0, visitors: 0 }
        return { hour: d.getHours(), visitors: valByHour.get(d.getHours()) ?? 0 }
      })

      return Array.from({ length: 24 }, (_, h) => {
        const found = labeled.find((x) => x.hour === h)
        return { hour: h, visitors: found?.visitors ?? 0 }
      })
    }

    const hourMap = new Map<number, number>()
    for (const r of rows) {
      const d = parseFlexible(r.dimensions?.[0] ?? undefined)
      if (d) hourMap.set(d.getHours(), r.metrics?.[0] ?? 0)
    }

    return Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      visitors: hourMap.get(h) ?? 0,
    }))
  }

  if (dataType === '30d') {
    const labels = result.meta?.time_labels
    const rows = result.results ?? []

    if (labels?.length) {
      const valByDay = new Map<number, number>()
      for (const r of rows) {
        const d = parseFlexible(r.dimensions?.[0] ?? undefined)
        if (d) valByDay.set(keyDay(d), r.metrics?.[0] ?? 0)
      }

      const series = labels.slice(0, 30).map((iso, i) => {
        const d = parseFlexible(iso)
        if (!d) return { day: i + 1, visitors: 0 }
        return { day: d.getDate(), visitors: valByDay.get(keyDay(d)) ?? 0 }
      })

      while (series.length < 30) {
        series.push({ day: series.length + 1, visitors: 0 })
      }
      return series
    }

    const series = rows.map((r, i) => {
      const d = parseFlexible(r.dimensions?.[0] ?? undefined)
      return { day: d ? d.getDate() : i + 1, visitors: r.metrics?.[0] ?? 0 }
    })

    while (series.length < 30) {
      series.push({ day: series.length + 1, visitors: 0 })
    }
    return series.slice(0, 30)
  }

  if (dataType === '1y') {
    const rows = result.results ?? []
    const valByMonth = new Map<number, number>()
    for (const r of rows) {
      const d = parseFlexible(r.dimensions?.[0] ?? undefined)
      if (d) {
        const monthKey = d.getMonth()
        valByMonth.set(
          monthKey,
          (valByMonth.get(monthKey) || 0) + (r.metrics?.[0] ?? 0),
        )
      }
    }

    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ]
    return monthNames.map((month, monthIndex) => ({
      month,
      visitors: valByMonth.get(monthIndex) ?? 0,
    }))
  }

  return result.results ?? []
}

export function createQuery(siteId: string, dataType: DataType): PlausibleQuery {
  switch (dataType) {
    case 'realtime': {
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      return {
        site_id: siteId,
        metrics: ['visitors'],
        date_range: [fiveMinutesAgo.toISOString(), now.toISOString()],
        include: { time_labels: false, total_rows: false },
      }
    }
    case '24h': {
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      return {
        site_id: siteId,
        metrics: ['visitors'],
        date_range: [yesterday.toISOString(), now.toISOString()],
        dimensions: ['time'],
        include: { time_labels: true, total_rows: false },
      }
    }
    case '30d':
      return {
        site_id: siteId,
        metrics: ['visitors'],
        date_range: '30d',
        dimensions: ['time'],
        include: { time_labels: true, total_rows: false },
      }
    case '1y':
      return {
        site_id: siteId,
        metrics: ['visitors'],
        date_range: '12mo',
        dimensions: ['time'],
        include: { time_labels: true, total_rows: false },
      }
    default:
      throw new Error(`Unknown data type: ${dataType}`)
  }
}
