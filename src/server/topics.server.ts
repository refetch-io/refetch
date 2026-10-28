import type { Channel, FeedPage, Topic, TopicAbout, TopicSort } from '@/lib/types'
import { labelFromKey, topicDisplayLabel, topicKey, topicLabelVariants } from '@/lib/topics'
import { listChannels, queryPosts } from './channels.server'
import { Query, db, listPostRows, type Row } from './db.server'

const DAY = 24 * 60 * 60 * 1000
const QUALITY = { maxSpamScore: 70, minRelevancyScore: 30 }

/** Small TTL cache keyed by string; the oldest entry goes once it holds `max`. */
function createCache<T>(ttl: number, max = 500) {
  const entries = new Map<string, { value: T; expires: number }>()
  return async (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = entries.get(key)
    if (hit && hit.expires > Date.now()) return hit.value
    const value = await load()
    entries.delete(key)
    entries.set(key, { value, expires: Date.now() + ttl })
    if (entries.size > max) entries.delete(entries.keys().next().value!)
    return value
  }
}

function toTopic(row: Row): Topic {
  return {
    key: String(row.topicKey),
    label: topicDisplayLabel(String(row.topicLabel ?? row.topicKey)),
    articleCount: Number(row.articleCount ?? 0),
  }
}

/* ──────────────────────────────── Lookup ──────────────────────────────── */

const topicCache = createCache<Topic | null>(30 * 60_000)

/**
 * A topic from the all-time stats (functions/topic-stats). Labels that are
 * too new for the stats get one from their key, with no count.
 */
export async function getTopic(key: string): Promise<{ topic: Topic; known: boolean }> {
  const found = await topicCache(key, async () => {
    const { tables, ids } = db()
    const result = await tables.listRows({
      databaseId: ids.databaseId,
      tableId: ids.topics,
      queries: [
        Query.equal('topicKey', key),
        Query.limit(1),
        Query.select(['topicKey', 'topicLabel', 'articleCount']),
      ],
      total: false,
    })
    const row = result.rows[0] as Row | undefined
    return row ? toTopic(row) : null
  }).catch((error: unknown) => {
    // Not cached, so the next request tries again.
    console.error('[topics] failed to look up a topic', error)
    return null
  })
  if (found) return { topic: found, known: true }
  return { topic: { key, label: topicDisplayLabel(labelFromKey(key)), articleCount: 0 }, known: false }
}

/** Spellings stories may use for the topic (they store the raw label). */
function topicFilter(topic: Topic) {
  const variants = new Set([
    ...topicLabelVariants(topic.label),
    ...topicLabelVariants(labelFromKey(topic.key)),
  ])
  return Query.containsAny('topics', [...variants])
}

const directoryCache = createCache<Array<Topic>>(60 * 60_000, 10)

/** Topics with at least `minStories` stories, biggest first (by summed score). */
export function listTopTopics(limit: number, minStories: number): Promise<Array<Topic>> {
  return directoryCache(`${limit}:${minStories}`, async () => {
    const { tables, ids } = db()
    const topics: Array<Topic> = []
    const batch = 500
    try {
      while (topics.length < limit) {
        const result = await tables.listRows({
          databaseId: ids.databaseId,
          tableId: ids.topics,
          queries: [
            Query.greaterThanEqual('articleCount', minStories),
            Query.orderDesc('totalScore'),
            Query.limit(Math.min(batch, limit - topics.length)),
            Query.offset(topics.length),
            Query.select(['topicKey', 'topicLabel', 'articleCount']),
          ],
          total: false,
        })
        topics.push(...(result.rows as Array<Row>).map(toTopic))
        if (result.rows.length < batch) break
      }
    } catch (error) {
      console.error('[topics] failed to list topics', error)
    }
    return topics
  })
}

/* ───────────────────────────────── Feed ───────────────────────────────── */

export function listTopicFeed(
  topic: Topic,
  sort: TopicSort,
  page: number,
  userId?: string,
): Promise<FeedPage> {
  return sort === 'top'
    ? queryPosts(
        [Query.greaterThan('$createdAt', new Date(Date.now() - 30 * DAY).toISOString()), topicFilter(topic)],
        [Query.orderDesc('score'), Query.orderDesc('$createdAt')],
        page,
        userId,
      )
    : queryPosts([topicFilter(topic)], [Query.orderDesc('$createdAt')], page, userId)
}

/* ──────────────────────────────── About ──────────────────────────────── */

const aboutCache = createCache<TopicAbout>(30 * 60_000)

/** Channels whose keywords name the topic, then those covering its neighbors. */
function channelsFor(keys: Array<string>, channels: Array<Channel>): Array<string> {
  const ids: Array<string> = []
  for (const key of keys) {
    for (const channel of channels) {
      if (ids.includes(channel.id)) continue
      if (channel.keywords.some((keyword) => topicKey(keyword) === key)) ids.push(channel.id)
    }
    if (ids.length >= 3) break
  }
  return ids.slice(0, 3)
}

/** Neighboring topics (from the last 200 stories) and recent activity, for the rail. */
export function getTopicAbout(topic: Topic): Promise<TopicAbout> {
  return aboutCache(topic.key, async () => {
    const { tables, ids } = db()
    const [rows, weekly, channels] = await Promise.all([
      listPostRows([
        topicFilter(topic),
        Query.equal('enhanced', true),
        Query.lessThan('spamScore', QUALITY.maxSpamScore),
        Query.orderDesc('$createdAt'),
        Query.limit(200),
        Query.select(['topics']),
      ]).catch(() => [] as Array<Row>),
      tables
        .listRows({
          databaseId: ids.databaseId,
          tableId: ids.posts,
          queries: [
            topicFilter(topic),
            Query.greaterThan('$createdAt', new Date(Date.now() - 7 * DAY).toISOString()),
            Query.equal('enhanced', true),
            Query.limit(1),
            Query.select(['$id']),
          ],
          total: true,
        })
        .then((result) => result.total)
        .catch(() => 0),
      listChannels(),
    ])

    const counts = new Map<string, Topic>()
    for (const row of rows) {
      const seen = new Set<string>([topic.key])
      for (const raw of Array.isArray(row.topics) ? row.topics : []) {
        if (typeof raw !== 'string') continue
        const key = topicKey(raw)
        if (!key || seen.has(key)) continue
        seen.add(key)
        const entry = counts.get(key)
        if (entry) entry.articleCount += 1
        else counts.set(key, { key, label: topicDisplayLabel(raw), articleCount: 1 })
      }
    }
    const related = [...counts.values()]
      .filter((entry) => entry.articleCount > 1)
      .sort((a, b) => b.articleCount - a.articleCount || a.key.localeCompare(b.key))
      .slice(0, 12)

    return {
      related,
      channels: channelsFor([topic.key, ...related.map((entry) => entry.key)], channels),
      weeklyStories: weekly,
    }
  })
}
