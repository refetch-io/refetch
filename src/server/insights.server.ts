import type { TrendingTopic, VisitorPoint, VisitorRange } from '@/lib/types'
import { Query, db, type Row } from './db.server'
import { getPlausibleConfig } from './env.server'

/** Tiny TTL cache that serves stale data when the upstream fails. */
function createCache<T>() {
  const entries = new Map<string, { value: T; expires: number }>()
  return async (key: string, ttl: number, load: () => Promise<T>, fallback: T): Promise<T> => {
    const hit = entries.get(key)
    if (hit && hit.expires > Date.now()) return hit.value
    try {
      const value = await load()
      entries.set(key, { value, expires: Date.now() + ttl })
      return value
    } catch (error) {
      console.error(`[insights] ${key} failed`, error)
      return hit?.value ?? fallback
    }
  }
}

/* ───────────────────────────── Plausible analytics ───────────────────────────── */

const PLAUSIBLE_QUERY_URL = 'https://plausible.io/api/v2/query'

interface PlausibleResult {
  results: Array<{ metrics: Array<number | null>; dimensions: Array<string | null> }>
  meta?: { time_labels?: Array<string> }
}

async function plausible(query: Record<string, unknown>): Promise<PlausibleResult> {
  const config = getPlausibleConfig()
  if (!config) throw new Error('Plausible is not configured (PLAUSIBLE_API_KEY, PLAUSIBLE_SITE_ID).')
  const response = await fetch(PLAUSIBLE_QUERY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ site_id: config.siteId, metrics: ['visitors'], ...query }),
    signal: AbortSignal.timeout(8_000),
  })
  if (!response.ok) throw new Error(`Plausible responded with ${response.status}: ${await response.text()}`)
  const json = (await response.json()) as PlausibleResult & { error?: string }
  if (json.error) throw new Error(json.error)
  return json
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
      const since = new Date(now.getTime() - 5 * 60 * 1000)
      const result = await plausible({ date_range: [since.toISOString(), now.toISOString()] })
      // The person looking at the widget is online too.
      return Math.max(Number(result.results[0]?.metrics[0] ?? 0), 1)
    },
    null,
  )
}

const RANGE_CONFIG: Record<VisitorRange, { ttl: number; dateRange: () => string | Array<string> }> = {
  '24h': {
    ttl: 5 * 60_000,
    dateRange: () => {
      const now = new Date()
      return [new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), now.toISOString()]
    },
  },
  '30d': { ttl: 30 * 60_000, dateRange: () => '30d' },
  '1y': { ttl: 60 * 60_000, dateRange: () => '12mo' },
}

export function getVisitorSeries(range: VisitorRange) {
  const config = RANGE_CONFIG[range]
  return seriesCache(
    `series:${range}`,
    config.ttl,
    async () => {
      const dateRange = config.dateRange()
      const [series, totals] = await Promise.all([
        plausible({ date_range: dateRange, dimensions: ['time'], include: { time_labels: true } }),
        plausible({ date_range: dateRange }),
      ])
      const byLabel = new Map<string, number>()
      for (const row of series.results) {
        const label = row.dimensions[0]
        if (label) byLabel.set(label, Number(row.metrics[0] ?? 0))
      }
      const labels = series.meta?.time_labels ?? [...byLabel.keys()]
      return {
        points: labels.map((label) => ({ label, visitors: byLabel.get(label) ?? 0 })),
        total: Number(totals.results[0]?.metrics[0] ?? 0),
      }
    },
    null,
  )
}

/* ───────────────────────────────── Trending topics ──────────────────────────────── */

const topicsCache = createCache<Array<TrendingTopic>>()

/** Same normalization as functions/topic-stats, so keys line up. */
function topicKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
}

function displayLabel(label: string) {
  const trimmed = label.trim()
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

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
        label: displayLabel(String(row.topicLabel)),
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
        totals.set(key, { key, label: displayLabel(raw), articleCount: 1, score })
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
