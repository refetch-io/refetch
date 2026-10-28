import type { ThreadStats, TodayStats, TrendingTopic, VisitorPoint, VisitorRange } from '@/lib/types'
import { buildThreadStats, threadStatsWindow, type MetricRow } from '@/lib/thread-stats'
import { topicDisplayLabel, topicKey } from '@/lib/topics'
import { Query, db, listPostRows, type Row } from './db.server'
import { getAppwriteConfig, getPublicConfig } from './env.server'

/** Tiny TTL cache that serves stale data when the upstream fails. Oldest keys go past `maxEntries`. */
function createCache<T>(maxEntries = Infinity) {
  const entries = new Map<string, { value: T; expires: number }>()
  return async (key: string, ttl: number, load: () => Promise<T>, fallback: T): Promise<T> => {
    const hit = entries.get(key)
    if (hit && hit.expires > Date.now()) return hit.value
    try {
      const value = await load()
      entries.delete(key)
      entries.set(key, { value, expires: Date.now() + ttl })
      if (entries.size > maxEntries) entries.delete(entries.keys().next().value!)
      return value
    } catch (error) {
      console.error(`[insights] ${key} failed`, error)
      return hit?.value ?? fallback
    }
  }
}

/* ───────────────────────────── Appwrite Analytics ───────────────────────────── */

type Interval = '1h' | '1d' | '1m'

interface MetricsResult {
  metrics: Array<MetricRow>
}

/** `equal` filter in Appwrite's JSON query syntax. */
const equal = (attribute: string, value: string) =>
  JSON.stringify({ method: 'equal', attribute, values: [value] })

/** Reads the property's metrics with the server key (needs the `analytics.read` scope). */
async function analytics(params: {
  startAt: Date
  endAt: Date
  interval?: Interval
  /** Break the metrics down by one dimension (page, eventName, referrerSource…). */
  dimension?: string
  /** Filters on the underlying events, built with `equal`. */
  queries?: Array<string>
  limit?: number
}): Promise<MetricsResult> {
  const { appwriteEndpoint, appwriteProjectId, analyticsPropertyId } = getPublicConfig()
  if (!analyticsPropertyId)
    throw new Error('Appwrite Analytics is not configured (APPWRITE_ANALYTICS_PROPERTY_ID).')
  const url = new URL(`${appwriteEndpoint}/analytics/properties/${analyticsPropertyId}/metrics`)
  url.searchParams.set('startAt', params.startAt.toISOString())
  url.searchParams.set('endAt', params.endAt.toISOString())
  if (params.interval) url.searchParams.set('interval', params.interval)
  if (params.dimension) url.searchParams.append('dimensions[]', params.dimension)
  for (const query of params.queries ?? []) url.searchParams.append('queries[]', query)
  if (params.limit) url.searchParams.set('limit', String(params.limit))
  const response = await fetch(url, {
    headers: { 'X-Appwrite-Project': appwriteProjectId, 'X-Appwrite-Key': getAppwriteConfig().apiKey },
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok)
    throw new Error(`Appwrite Analytics responded with ${response.status}: ${await response.text()}`)
  return (await response.json()) as MetricsResult
}

const liveCache = createCache<number | null>()
const seriesCache = createCache<{ points: Array<VisitorPoint>; total: number } | null>()

/** Visitors in the last five minutes ("refetchers online"). */
export function getLiveVisitors(): Promise<number | null> {
  return liveCache(
    'live',
    30_000,
    async () => {
      const now = new Date()
      const result = await analytics({ startAt: new Date(now.getTime() - 5 * 60 * 1000), endAt: now })
      // The person looking at the widget is online too.
      return Math.max(Number(result.metrics[0]?.visitors ?? 0), 1)
    },
    null,
  )
}

/**
 * Bucket starts (UTC) for each range, oldest first. Appwrite leaves out empty
 * buckets, so the series is laid out here and filled with zeros.
 */
const RANGE_CONFIG: Record<
  VisitorRange,
  { ttl: number; interval: Interval; buckets: (now: Date) => Array<Date> }
> = {
  '24h': {
    ttl: 5 * 60_000,
    interval: '1h',
    buckets: (now) => {
      const hour = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours())
      return Array.from({ length: 24 }, (_, i) => new Date(hour - (23 - i) * 3_600_000))
    },
  },
  '30d': {
    ttl: 30 * 60_000,
    interval: '1d',
    buckets: (now) =>
      Array.from(
        { length: 30 },
        (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (29 - i))),
      ),
  },
  '1y': {
    ttl: 60 * 60_000,
    interval: '1m',
    buckets: (now) =>
      Array.from(
        { length: 12 },
        (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - i), 1)),
      ),
  },
}

export function getVisitorSeries(range: VisitorRange) {
  const config = RANGE_CONFIG[range]
  return seriesCache(
    `series:${range}`,
    config.ttl,
    async () => {
      const endAt = new Date()
      const buckets = config.buckets(endAt)
      const startAt = buckets[0]
      const [series, totals] = await Promise.all([
        analytics({ startAt, endAt, interval: config.interval }),
        analytics({ startAt, endAt }),
      ])
      const byTime = new Map<number, number>()
      for (const row of series.metrics) {
        if (row.date) byTime.set(new Date(row.date).getTime(), Number(row.visitors ?? 0))
      }
      return {
        points: buckets.map((start) => ({
          label: range === '24h' ? start.toISOString() : start.toISOString().slice(0, 10),
          visitors: byTime.get(start.getTime()) ?? 0,
        })),
        total: Number(totals.metrics[0]?.visitors ?? 0),
      }
    },
    null,
  )
}

/* ───────────────────────────────── Thread stats ───────────────────────────────── */

const threadStatsCache = createCache<ThreadStats | null>(1_000)

async function postCreatedAt(postId: string): Promise<Date | null> {
  const { tables, ids } = db()
  try {
    const row = await tables.getRow({
      databaseId: ids.databaseId,
      tableId: ids.posts,
      rowId: postId,
      queries: [Query.select(['$createdAt'])],
    })
    return new Date(String(row.$createdAt))
  } catch {
    return null
  }
}

/**
 * Views, unique viewers, article opens, shares, a views chart and top sources
 * for one thread. Views and viewers count pageviews only, since article opens
 * from the feed are recorded against the thread's URL too.
 */
export function getThreadStats(postId: string): Promise<ThreadStats | null> {
  return threadStatsCache(
    `thread:${postId}`,
    5 * 60_000,
    async () => {
      if (!getPublicConfig().analyticsPropertyId) return null
      const createdAt = await postCreatedAt(postId)
      if (!createdAt) return null
      const window = threadStatsWindow(createdAt, new Date())
      const page = equal('page', `/threads/${postId}`)
      const pageviews = [page, equal('eventName', 'pageview')]
      const span = { startAt: window.startAt, endAt: window.endAt }

      const [byEvent, byHostname, series, bySource] = await Promise.all([
        analytics({ ...span, dimension: 'eventName', queries: [page], limit: 50 }),
        analytics({ ...span, dimension: 'hostname', queries: pageviews }),
        analytics({
          startAt: window.buckets[0],
          endAt: window.endAt,
          interval: window.interval,
          queries: pageviews,
        }),
        analytics({ ...span, dimension: 'referrerSource', queries: pageviews, limit: 5 }),
      ])
      return buildThreadStats({
        window,
        byEvent: byEvent.metrics,
        byHostname: byHostname.metrics,
        series: series.metrics,
        bySource: bySource.metrics,
      })
    },
    null,
  )
}

/* ───────────────────────────────── Trending topics ──────────────────────────────── */

const topicsCache = createCache<Array<TrendingTopic>>()

async function readDailyTopics(limit: number): Promise<Array<TrendingTopic>> {
  const { tables, ids } = db()
  const day = (offset: number) => new Date(Date.now() - offset * 86_400_000).toISOString().slice(0, 10)
  for (const date of [day(0), day(1)]) {
    const result = await tables.listRows({
      databaseId: ids.databaseId,
      tableId: ids.dailyTopics,
      queries: [
        Query.equal('date', date),
        Query.orderAsc('rank'),
        Query.limit(limit),
        Query.select(['topicKey', 'topicLabel', 'articleCount']),
      ],
      total: false,
    })
    if (result.rows.length > 0) {
      return (result.rows as Array<Row>).map((row) => ({
        key: String(row.topicKey),
        label: topicDisplayLabel(String(row.topicLabel)),
        articleCount: Number(row.articleCount ?? 0),
      }))
    }
  }
  return []
}

/**
 * Fallback when the topic-stats function hasn't written today's snapshot:
 * aggregate the `topics` of the last 24 hours' ranked posts, weighted by score.
 */
async function computeTopicsFromPosts(limit: number): Promise<Array<TrendingTopic>> {
  const { tables, ids } = db()
  const result = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.posts,
    queries: [
      Query.greaterThan('$createdAt', new Date(Date.now() - 86_400_000).toISOString()),
      Query.lessThan('spamScore', 70),
      Query.greaterThan('relevancyScore', 30),
      Query.equal('enhanced', true),
      Query.orderDesc('score'),
      Query.limit(200),
      Query.select(['topics', 'score']),
    ],
    total: false,
  })

  const totals = new Map<string, TrendingTopic & { score: number }>()
  for (const post of result.rows as Array<Row>) {
    const score = Number(post.score) || 0
    const seen = new Set<string>()
    for (const raw of Array.isArray(post.topics) ? post.topics : []) {
      if (typeof raw !== 'string') continue
      const key = topicKey(raw)
      if (!key || seen.has(key)) continue
      seen.add(key)
      const entry = totals.get(key)
      if (entry) {
        entry.score += score
        entry.articleCount += 1
      } else {
        totals.set(key, { key, label: topicDisplayLabel(raw), articleCount: 1, score })
      }
    }
  }

  return [...totals.values()]
    .filter((topic) => topic.articleCount > 1)
    .sort((a, b) => b.score - a.score || b.articleCount - a.articleCount)
    .slice(0, limit)
    .map(({ key, label, articleCount }) => ({ key, label, articleCount }))
}

/** Today's top topics (from the `topic-stats` function, or computed live). */
export function getTrendingTopics(limit = 8): Promise<Array<TrendingTopic>> {
  return topicsCache(
    `topics:${limit}`,
    5 * 60_000,
    async () => {
      const daily = await readDailyTopics(limit).catch(() => [])
      return daily.length > 0 ? daily : computeTopicsFromPosts(limit)
    },
    [],
  )
}

/* ──────────────────────────────────── Today ──────────────────────────────────── */

const todayCache = createCache<TodayStats | null>()

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS
/** Today's posts are read in pages; the cap keeps a flood from turning into dozens of requests. */
const TODAY_PAGE_SIZE = 500
const TODAY_MAX_PAGES = 10

/** Stories shared since midnight UTC (by hour, and against yesterday), with the day's comments, votes and channels. */
export function getTodayStats(): Promise<TodayStats | null> {
  return todayCache(
    'today',
    2 * 60_000,
    async () => {
      const { tables, ids } = db()
      const now = Date.now()
      const today = new Date(now)
      const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
      const iso = (ms: number) => new Date(ms).toISOString()
      // Same gates as the feeds, so the number matches what people can actually read.
      const onTopic = [
        Query.lessThan('spamScore', 70),
        Query.greaterThan('relevancyScore', 30),
        Query.equal('enhanced', true),
      ]
      const count = (tableId: string, queries: Array<string>) =>
        tables
          .listRows({
            databaseId: ids.databaseId,
            tableId,
            queries: [...queries, Query.limit(1), Query.select(['$id'])],
          })
          .then((result) => result.total)

      async function todaysPosts() {
        const rows: Array<Row> = []
        for (let page = 0; page < TODAY_MAX_PAGES; page++) {
          const batch = await listPostRows([
            Query.greaterThanEqual('$createdAt', iso(midnight)),
            ...onTopic,
            Query.limit(TODAY_PAGE_SIZE),
            Query.select(['$id', '$createdAt', 'channel']),
            ...(rows.length > 0 ? [Query.cursorAfter(rows[rows.length - 1].$id)] : []),
          ])
          rows.push(...batch)
          if (batch.length < TODAY_PAGE_SIZE) break
        }
        return rows
      }

      const [posts, yesterday, comments, votes] = await Promise.all([
        todaysPosts(),
        count(ids.posts, [
          Query.greaterThanEqual('$createdAt', iso(midnight - DAY_MS)),
          Query.lessThan('$createdAt', iso(now - DAY_MS)),
          ...onTopic,
        ]),
        count(ids.comments, [Query.greaterThanEqual('$createdAt', iso(midnight))]),
        count(ids.votes, [Query.greaterThanEqual('$createdAt', iso(midnight))]),
      ])

      const hours = Array.from({ length: 24 }, () => 0)
      const channels = new Set<string>()
      for (const post of posts) {
        const hour = Math.floor((new Date(post.$createdAt).getTime() - midnight) / HOUR_MS)
        if (hour >= 0 && hour < 24) hours[hour]++
        if (typeof post.channel === 'string' && post.channel) channels.add(post.channel)
      }

      return {
        stories: posts.length,
        yesterday,
        hours,
        hour: today.getUTCHours(),
        comments,
        votes,
        channels: channels.size,
      }
    },
    null,
  )
}

/* ──────────────────────────────────── GitHub ──────────────────────────────────── */

const starsCache = createCache<number | null>()

export function getGitHubStars(): Promise<number | null> {
  return starsCache(
    'stars',
    60 * 60_000,
    async () => {
      const response = await fetch('https://api.github.com/repos/refetch-io/refetch', {
        headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'refetch.io' },
        signal: AbortSignal.timeout(5_000),
      })
      if (!response.ok) throw new Error(`GitHub responded with ${response.status}`)
      const json = (await response.json()) as { stargazers_count?: number }
      return typeof json.stargazers_count === 'number' ? json.stargazers_count : null
    },
    null,
  )
}
