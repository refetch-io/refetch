import { buildSitemap, type SitemapEntry } from '@/lib/sitemap'
import { listChannels } from './channels.server'
import { Query, listPostRows } from './db.server'
import { getSiteUrl } from './env.server'
import { listTopTopics } from './topics.server'

/** Stories in the sitemap: the most recent on-topic ones (Google reads up to 50,000 URLs). */
const MAX_STORIES = 5000
/** Topic pages with enough stories to stand on their own, biggest first. */
const MAX_TOPICS = 1000
const MIN_TOPIC_STORIES = 10
const BATCH = 500
const QUALITY = { maxSpamScore: 70, minRelevancyScore: 30 }
const CACHE_MS = 60 * 60_000

let cached: { xml: string; expires: number } | null = null

export async function renderSitemap(): Promise<string> {
  if (cached && cached.expires > Date.now()) return cached.xml
  const site = getSiteUrl()
  const now = new Date().toISOString()

  const entries: Array<SitemapEntry> = [
    { loc: `${site}/`, lastmod: now, changefreq: 'hourly', priority: 1 },
    { loc: `${site}/new`, lastmod: now, changefreq: 'hourly', priority: 0.8 },
    { loc: `${site}/show`, lastmod: now, changefreq: 'daily', priority: 0.6 },
    { loc: `${site}/channels`, changefreq: 'weekly', priority: 0.6 },
    { loc: `${site}/topics`, lastmod: now, changefreq: 'daily', priority: 0.6 },
  ]

  const [channels, topics] = await Promise.all([
    listChannels().catch(() => []),
    listTopTopics(MAX_TOPICS, MIN_TOPIC_STORIES),
  ])
  for (const channel of channels) {
    entries.push({ loc: `${site}/channels/${channel.id}`, lastmod: now, changefreq: 'hourly', priority: 0.7 })
  }
  for (const topic of topics) {
    entries.push({ loc: `${site}/topics/${topic.key}`, changefreq: 'daily', priority: 0.5 })
  }

  let cursor: string | undefined
  let stories = 0
  while (stories < MAX_STORIES) {
    const rows = await listPostRows([
      Query.equal('enhanced', true),
      Query.lessThan('spamScore', QUALITY.maxSpamScore),
      Query.greaterThan('relevancyScore', QUALITY.minRelevancyScore),
      Query.orderDesc('$createdAt'),
      Query.limit(BATCH),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
      Query.select(['$id', '$createdAt', '$updatedAt']),
    ]).catch((error: unknown) => {
      console.error('[sitemap] failed to list stories', error)
      return []
    })
    for (const row of rows) {
      entries.push({
        loc: `${site}/threads/${row.$id}`,
        lastmod: row.$updatedAt ?? row.$createdAt,
        priority: 0.5,
      })
    }
    stories += rows.length
    if (rows.length < BATCH) break
    cursor = rows.at(-1)?.$id
  }

  const xml = buildSitemap(entries)
  cached = { xml, expires: Date.now() + CACHE_MS }
  return xml
}
