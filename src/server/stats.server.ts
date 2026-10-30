import type { CommunityStats, StatsStory, TrafficStats } from '@/lib/types'
import {
  countByDay,
  dayStarts,
  metricTallies,
  monthStarts,
  tally,
  threadIdFromPage,
  weekGrid,
} from '@/lib/site-stats'
import { topicDisplayLabel } from '@/lib/topics'
import { hostnameOf } from '@/lib/url'
import { createAdminClient } from './appwrite.server'
import { Query, db, listPostRows, type Row } from './db.server'
import { getPublicConfig } from './env.server'
import { analytics, createCache, equal } from './insights.server'

const DAY_MS = 86_400_000
/** Appwrite stops counting rows here; a range that reaches it is split and counted in halves. */
const COUNT_CAP = 5_000
/** The recent window for both halves of the page. */
const RECENT_DAYS = 30
/** The visiting-hours grid covers two full weeks (hourly rows stay under the API's 500 limit). */
const WEEK_GRID_DAYS = 14
/** Recent posts are read in pages; the cap keeps a flood from turning into dozens of requests. */
const SCAN_PAGE_SIZE = 1_000
const SCAN_MAX_PAGES = 12

/** Same gates as the feeds, so the numbers match what people can actually read. */
const ON_TOPIC = [
  Query.lessThan('spamScore', 70),
  Query.greaterThan('relevancyScore', 30),
  Query.equal('enhanced', true),
]

const iso = (date: Date | number) => new Date(date).toISOString()

/** Rows of a table created in [start, end), counting past Appwrite's cap by halving the range. */
async function countBetween(
  tableId: string,
  filters: Array<string>,
  start: Date,
  end: Date,
  depth = 0,
): Promise<number> {
  const { tables, ids } = db()
  const result = await tables.listRows({
    databaseId: ids.databaseId,
    tableId,
    queries: [
      ...filters,
      Query.greaterThanEqual('$createdAt', iso(start)),
      Query.lessThan('$createdAt', iso(end)),
      Query.limit(1),
      Query.select(['$id']),
    ],
  })
  if (result.total < COUNT_CAP || depth >= 8) return result.total
  const middle = new Date((start.getTime() + end.getTime()) / 2)
  const [first, second] = await Promise.all([
    countBetween(tableId, filters, start, middle, depth + 1),
    countBetween(tableId, filters, middle, end, depth + 1),
  ])
  return first + second
}

/** Every row of a small table (or the cap, for a table that has outgrown "small"). */
async function countAll(tableId: string): Promise<number> {
  const { tables, ids } = db()
  const result = await tables
    .listRows({ databaseId: ids.databaseId, tableId, queries: [Query.limit(1), Query.select(['$id'])] })
    .catch(() => ({ total: 0 }))
  return result.total
}

/**
 * Accounts, from Appwrite Users when the API key has `users.read`; otherwise
 * profiles, which only exist for people who've set one up.
 */
async function countMembers(): Promise<number> {
  try {
    const result = await createAdminClient().users.list({ queries: [Query.limit(1)] })
    return result.total
  } catch {
    return countAll(db().ids.profiles)
  }
}

async function firstStoryAt(): Promise<Date | null> {
  const rows = await listPostRows([
    Query.orderAsc('$createdAt'),
    Query.limit(1),
    Query.select(['$createdAt']),
  ])
  return rows[0] ? new Date(rows[0].$createdAt) : null
}

async function recentPosts(since: Date): Promise<Array<Row>> {
  const rows: Array<Row> = []
  for (let page = 0; page < SCAN_MAX_PAGES; page++) {
    const batch = await listPostRows([
      Query.greaterThanEqual('$createdAt', iso(since)),
      ...ON_TOPIC,
      Query.limit(SCAN_PAGE_SIZE),
      Query.select(['$id', '$createdAt', 'link', 'type', 'channel', 'readingTime', 'readingLevel']),
      ...(rows.length > 0 ? [Query.cursorAfter(rows[rows.length - 1].$id)] : []),
    ])
    rows.push(...batch)
    if (batch.length < SCAN_PAGE_SIZE) break
  }
  return rows
}

/** Feeds Scout reads, counted once even when two channels share one. */
async function countFeeds(): Promise<number> {
  const { tables, ids } = db()
  const result = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.channels,
      queries: [Query.limit(200), Query.select(['sources', 'communitySources'])],
      total: false,
    })
    .catch(() => ({ rows: [] as Array<Row> }))
  const feeds = new Set<string>()
  for (const row of result.rows as Array<Row>) {
    for (const list of [row.sources, row.communitySources]) {
      if (Array.isArray(list)) for (const url of list) if (typeof url === 'string' && url) feeds.add(url)
    }
  }
  return feeds.size
}

async function topTopics(limit: number) {
  const { tables, ids } = db()
  const result = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.topics,
      queries: [
        Query.orderDesc('articleCount'),
        Query.limit(limit),
        Query.select(['topicKey', 'topicLabel', 'articleCount']),
      ],
      total: false,
    })
    .catch(() => ({ rows: [] as Array<Row> }))
  return (result.rows as Array<Row>).map((row) => ({
    key: String(row.topicKey),
    label: topicDisplayLabel(String(row.topicLabel)),
    articleCount: Number(row.articleCount ?? 0),
  }))
}

/** Stories with the most comments or votes, all time. */
async function topStories(column: 'countComments' | 'count', limit: number): Promise<Array<StatsStory>> {
  const rows = await listPostRows([
    Query.greaterThan(column, 0),
    Query.orderDesc(column),
    Query.limit(limit),
    Query.select(['$id', 'title', column]),
  ]).catch(() => [] as Array<Row>)
  return rows.map((row) => ({ id: row.$id, title: String(row.title ?? ''), count: Number(row[column]) }))
}

const communityCache = createCache<CommunityStats | null>()

/** Everything shared on Refetch, all time and over the last 30 days. Cached for half an hour. */
export function getCommunityStats(): Promise<CommunityStats | null> {
  return communityCache(
    'community',
    30 * 60_000,
    async () => {
      const { ids } = db()
      const now = new Date()
      const recentSince = new Date(now.getTime() - RECENT_DAYS * DAY_MS)
      const since = await firstStoryAt()
      const months = since ? monthStarts(since, now) : []
      const monthEnd = (index: number) => months[index + 1] ?? now

      const [storiesByMonth, commentsByMonth, votes, members, channels, follows, channelJoins] =
        await Promise.all([
          Promise.all(months.map((start, i) => countBetween(ids.posts, ON_TOPIC, start, monthEnd(i)))),
          Promise.all(months.map((start, i) => countBetween(ids.comments, [], start, monthEnd(i)))),
          countAll(ids.votes),
          countMembers(),
          countAll(ids.channels),
          countAll(ids.follows),
          countAll(ids.channelMembers),
        ])
      const [recent, feeds, topics, mostDiscussed, mostUpvoted] = await Promise.all([
        recentPosts(recentSince),
        countFeeds(),
        topTopics(8),
        topStories('countComments', 5),
        topStories('count', 5),
      ])

      const domains = recent.map((post) => hostnameOf(post.link))
      const reading = recent
        .map((post) => Number(post.readingTime))
        .filter((minutes) => Number.isFinite(minutes) && minutes > 0)
      const sum = (values: Array<number>) => values.reduce((total, value) => total + value, 0)

      return {
        stories: sum(storiesByMonth),
        comments: sum(commentsByMonth),
        votes,
        members,
        channels,
        follows,
        channelJoins,
        since: since?.toISOString() ?? null,
        months: months.map((start, i) => ({
          month: start.toISOString().slice(0, 7),
          stories: storiesByMonth[i],
          comments: commentsByMonth[i],
        })),
        feeds,
        recent: {
          stories: recent.length,
          showStories: recent.filter((post) => post.type === 'show').length,
          siteCount: new Set(domains.filter(Boolean)).size,
          readingTime: reading.length > 0 ? sum(reading) / reading.length : null,
          readingLevels: tally(
            recent.map((post) => (typeof post.readingLevel === 'string' ? post.readingLevel : null)),
            4,
          ),
          days: countByDay(
            recent.map((post) => post.$createdAt),
            dayStarts(now, RECENT_DAYS),
          ),
          sites: tally(domains, 10),
          channels: tally(
            recent.map((post) => (typeof post.channel === 'string' ? post.channel : null)),
            8,
          ),
        },
        topics,
        mostDiscussed,
        mostUpvoted,
      }
    },
    null,
  )
}

/* ───────────────────────────────── Traffic ──────────────────────────────── */

const trafficCache = createCache<TrafficStats | null>()

/** Visits without a bot category are people. */
const PEOPLE = equal('botCategory', '')

const DEVICE_LABELS: Record<string, string> = {
  desktop: 'Desktop',
  smartphone: 'Phone',
  tablet: 'Tablet',
}

async function threadTitles(threadIds: Array<string>): Promise<Map<string, string>> {
  if (threadIds.length === 0) return new Map()
  const rows = await listPostRows([
    Query.equal('$id', threadIds),
    Query.limit(threadIds.length),
    Query.select(['$id', 'title']),
  ]).catch(() => [] as Array<Row>)
  return new Map(rows.map((row) => [row.$id, String(row.title ?? '')]))
}

/** Who visits, from where, and how they read, over the last 30 days. Cached for 15 minutes. */
export function getTrafficStats(): Promise<TrafficStats | null> {
  return trafficCache(
    'traffic',
    15 * 60_000,
    async () => {
      if (!getPublicConfig().analyticsPropertyId) return null
      const endAt = new Date()
      const days = dayStarts(endAt, RECENT_DAYS)
      const span = { startAt: days[0], endAt }
      const breakdown = (dimension: string, limit = 8, queries = [PEOPLE]) =>
        analytics({ ...span, dimension, queries, limit })

      const [
        totals,
        daily,
        hourly,
        countries,
        devices,
        browsers,
        systems,
        referrers,
        events,
        bots,
        botNames,
        pages,
      ] = await Promise.all([
        analytics({ ...span, queries: [PEOPLE] }),
        analytics({ ...span, interval: '1d', queries: [PEOPLE] }),
        analytics({
          startAt: new Date(endAt.getTime() - WEEK_GRID_DAYS * DAY_MS),
          endAt,
          interval: '1h',
          queries: [PEOPLE],
          limit: 500,
        }),
        breakdown('country'),
        breakdown('device'),
        breakdown('browser', 6),
        breakdown('operatingSystem', 6),
        breakdown('referrerSource', 9),
        breakdown('eventName', 30),
        breakdown('botCategory', 10, []),
        analytics({ ...span, dimension: 'botName', limit: 6, queries: [] }),
        analytics({
          ...span,
          dimension: 'page',
          limit: 200,
          queries: [PEOPLE, equal('eventName', 'pageview')],
        }),
      ])

      const total = totals.metrics[0] ?? {}
      const number = (value: unknown) => Number(value ?? 0) || 0
      const perDay = new Map<number, number>()
      for (const row of daily.metrics) {
        if (row.date) perDay.set(new Date(row.date).getTime(), number(row.visitors))
      }

      const botVisitors = bots.metrics
        .filter((row) => row.value?.trim())
        .reduce((sum, row) => sum + number(row.visitors), 0)
      const people = number(total.visitors)

      const threadViews = pages.metrics
        .map((row) => ({ id: threadIdFromPage(row.value), views: number(row.visitors) }))
        .filter((row): row is { id: string; views: number } => Boolean(row.id) && row.views > 0)
        .slice(0, 8)
      const titles = await threadTitles(threadViews.map((row) => row.id))

      return {
        visitors: people,
        pageviews: number(total.pageviews),
        visits: number(total.visits),
        visitDuration: number(total.visitDuration),
        bounceRate: number(total.bounceRate),
        scrollDepth: number(total.scrollDepth),
        viewsPerVisit: number(total.viewsPerVisit),
        days: days.map((day) => ({
          label: day.toISOString().slice(0, 10),
          visitors: perDay.get(day.getTime()) ?? 0,
        })),
        week: weekGrid(hourly.metrics),
        countries: metricTallies(countries.metrics, 8),
        devices: metricTallies(devices.metrics, 4, { rename: (value) => DEVICE_LABELS[value] ?? value }),
        browsers: metricTallies(browsers.metrics, 5),
        systems: metricTallies(systems.metrics, 5),
        referrers: metricTallies(referrers.metrics, 8, { emptyLabel: 'Direct' }),
        outbound: number(events.metrics.find((row) => row.value === 'outbound_link')?.events),
        bots: {
          visitors: botVisitors,
          share: people + botVisitors > 0 ? botVisitors / (people + botVisitors) : 0,
          top: metricTallies(botNames.metrics, 5),
        },
        mostRead: threadViews
          .filter((row) => titles.get(row.id))
          .slice(0, 5)
          .map((row) => ({ id: row.id, title: titles.get(row.id)!, views: row.views })),
      }
    },
    null,
  )
}
