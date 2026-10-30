import {
  SITEMAP_PAGE_SIZE,
  buildSitemap,
  buildSitemapIndex,
  isCurrentPeriod,
  monthsBetween,
  parseSitemapFile,
  periodRange,
  sitemapFileName,
  yearsBetween,
  type SitemapEntry,
  type SitemapFile,
  type SitemapIndexEntry,
} from '@/lib/sitemap'
import { listChannels } from './channels.server'
import { Query, chunk, db, listPostRows, type Row } from './db.server'
import { getSiteUrl } from './env.server'

/** Topic pages with enough stories to stand on their own. */
const MIN_TOPIC_STORIES = 10
const BATCH = 500
/** Stories worth sending people to from search (same bar as the feeds). */
const QUALITY = [
  Query.equal('enhanced', true),
  Query.lessThan('spamScore', 70),
  Query.greaterThan('relevancyScore', 30),
]
/** Files that still change (the index, this month, this year) are rebuilt hourly; older ones daily. */
const FRESH_MS = 60 * 60_000
const SETTLED_MS = 24 * 60 * 60_000
/** Profiles checked for activity at once. */
const ACTIVITY_CONCURRENCY = 8
/** The Scout bot has no profile row but a real profile page. */
const BOT_USER_ID = '0'

const cache = new Map<string, { value: unknown; expires: number }>()

/** TTL cache that keeps serving the last good value if a rebuild fails. */
async function cached<T>(key: string, ttl: number, build: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  let value: T
  try {
    value = await build()
  } catch (error) {
    if (!hit) throw error
    console.error(`[sitemap] rebuilding ${key} failed, serving the previous copy`, error)
    return hit.value as T
  }
  cache.set(key, { value, expires: Date.now() + ttl })
  return value
}

/**
 * Serve a sitemap: 404 when it doesn't exist, and 503 when it can't be built
 * (with nothing cached), so crawlers retry later instead of seeing it empty.
 */
export async function sitemapResponse(render: () => Promise<string | null>): Promise<Response> {
  let xml: string | null
  try {
    xml = await render()
  } catch (error) {
    console.error('[sitemap] failed to build', error)
    return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Retry-After': '600' } })
  }
  if (xml === null) return new Response('Not found', { status: 404 })
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  })
}

/** `/sitemap.xml`: every page of every child sitemap. */
export function renderSitemapIndex(): Promise<string> {
  return cached('index', FRESH_MS, async () => {
    const site = getSiteUrl()
    const now = new Date().toISOString()
    const [threadPeriods, userPeriods] = await Promise.all([periodsOf('threads'), periodsOf('users')])
    const files: Array<PagedFile> = [
      { kind: 'topics', page: 1 },
      ...threadPeriods.map((period) => ({ kind: 'threads' as const, period, page: 1 })),
      ...userPeriods.map((period) => ({ kind: 'users' as const, period, page: 1 })),
    ]
    const counts = await Promise.all(files.map(pageCount))

    const loc = (file: SitemapFile) => `${site}/sitemaps/${sitemapFileName(file)}`
    const entries: Array<SitemapIndexEntry> = [{ loc: loc({ kind: 'pages' }), lastmod: now }]
    files.forEach((file, index) => {
      const growing = !('period' in file) || isCurrentPeriod(file.period, now)
      for (let page = 1; page <= counts[index]; page++) {
        entries.push({ loc: loc({ ...file, page }), lastmod: growing ? now : undefined })
      }
    })
    return buildSitemapIndex(entries)
  })
}

/** `/sitemaps/<name>`, or null when there's no such file (or page). */
export async function renderSitemapFile(name: string): Promise<string | null> {
  const file = parseSitemapFile(name)
  if (!file) return null
  if (file.kind === 'pages') return cached(name, FRESH_MS, async () => buildSitemap(await pageEntries()))
  if ('period' in file && !(await periodsOf(file.kind)).includes(file.period)) return null
  if (file.page > (await pageCount(file))) return null
  return cached(name, ttlFor(file), async () => buildSitemap(await pagedEntries(file)))
}

/* ───────────────────────────── Pagination ───────────────────────────── */

type PagedFile = Exclude<SitemapFile, { kind: 'pages' }>

/** The rows behind a paginated file (all periods when `period` is left out), before paging. */
interface Source {
  list: (queries: Array<string>) => Promise<Array<Row>>
  filters: Array<string>
  select: Array<string>
}

function sourceFor(kind: PagedFile['kind'], period?: string): Source {
  const { tables, ids } = db()
  const table =
    (tableId: string) =>
    (queries: Array<string>): Promise<Array<Row>> =>
      tables
        .listRows({ databaseId: ids.databaseId, tableId, queries, total: false })
        .then((result) => result.rows as Array<Row>)
  const inPeriod = () => {
    if (!period) return []
    const { start, end } = periodRange(period)
    return [Query.greaterThanEqual('$createdAt', start), Query.lessThan('$createdAt', end)]
  }
  switch (kind) {
    case 'topics':
      return {
        list: table(ids.topics),
        filters: [Query.greaterThanEqual('articleCount', MIN_TOPIC_STORIES)],
        select: ['$id', '$createdAt', 'topicKey', 'lastComputedAt'],
      }
    case 'threads':
      return {
        list: listPostRows,
        filters: [...QUALITY, ...inPeriod()],
        select: ['$id', '$createdAt', '$updatedAt'],
      }
    case 'users':
      return {
        list: table(ids.profiles),
        filters: inPeriod(),
        select: ['$id', '$createdAt', '$updatedAt'],
      }
  }
}

function sourceOf(file: PagedFile): Source {
  return sourceFor(file.kind, 'period' in file ? file.period : undefined)
}

function ttlFor(file: PagedFile): number {
  return 'period' in file && !isCurrentPeriod(file.period, new Date().toISOString()) ? SETTLED_MS : FRESH_MS
}

/** Months (stories) or years (people) from the oldest row to now, newest first. */
function periodsOf(kind: 'threads' | 'users'): Promise<Array<string>> {
  return cached(`periods:${kind}`, FRESH_MS, async () => {
    const { list, filters } = sourceFor(kind)
    const rows = await list([
      ...filters,
      Query.orderAsc('$createdAt'),
      Query.limit(1),
      Query.select(['$id', '$createdAt']),
    ])
    const first = rows[0]?.$createdAt
    if (!first) return []
    const now = new Date().toISOString()
    return kind === 'threads' ? monthsBetween(first, now) : yearsBetween(first, now)
  })
}

/**
 * Pages a file's rows fill (always at least one). Counting totals isn't
 * reliable past Appwrite's count cap, so probe for the first row of each
 * following page instead.
 */
function pageCount(file: PagedFile): Promise<number> {
  return cached(`count:${sitemapFileName({ ...file, page: 1 })}`, ttlFor(file), async () => {
    const { list, filters } = sourceOf(file)
    let pages = 1
    for (;;) {
      const next = await list([
        ...filters,
        Query.orderAsc('$createdAt'),
        Query.offset(pages * SITEMAP_PAGE_SIZE),
        Query.limit(1),
        Query.select(['$id']),
      ])
      if (next.length === 0) return pages
      pages++
    }
  })
}

/** One page of rows, oldest first: jump to its start, then follow the cursor. */
async function listPage({ list, filters, select }: Source, page: number): Promise<Array<Row>> {
  const rows: Array<Row> = []
  let cursor: string | undefined
  while (rows.length < SITEMAP_PAGE_SIZE) {
    const limit = Math.min(BATCH, SITEMAP_PAGE_SIZE - rows.length)
    const batch = await list([
      ...filters,
      Query.orderAsc('$createdAt'),
      Query.limit(limit),
      cursor ? Query.cursorAfter(cursor) : Query.offset((page - 1) * SITEMAP_PAGE_SIZE),
      Query.select(select),
    ])
    rows.push(...batch)
    if (batch.length < limit) break
    cursor = batch.at(-1)?.$id
  }
  return rows
}

/* ───────────────────────────── Files ───────────────────────────── */

async function pageEntries(): Promise<Array<SitemapEntry>> {
  const site = getSiteUrl()
  const now = new Date().toISOString()
  const channels = await listChannels().catch(() => [])
  return [
    { loc: `${site}/`, lastmod: now, changefreq: 'hourly', priority: 1 },
    { loc: `${site}/new`, lastmod: now, changefreq: 'hourly', priority: 0.8 },
    { loc: `${site}/show`, lastmod: now, changefreq: 'daily', priority: 0.6 },
    { loc: `${site}/channels`, changefreq: 'weekly', priority: 0.6 },
    { loc: `${site}/topics`, lastmod: now, changefreq: 'daily', priority: 0.6 },
    { loc: `${site}/stats`, lastmod: now, changefreq: 'daily', priority: 0.4 },
    ...channels.map((channel) => ({
      loc: `${site}/channels/${channel.id}`,
      lastmod: now,
      changefreq: 'hourly' as const,
      priority: 0.7,
    })),
    { loc: `${site}/users/${BOT_USER_ID}`, changefreq: 'hourly', priority: 0.3 },
  ]
}

async function pagedEntries(file: PagedFile): Promise<Array<SitemapEntry>> {
  const site = getSiteUrl()
  const rows = await listPage(sourceOf(file), file.page)
  switch (file.kind) {
    case 'topics':
      return rows.map((row) => ({
        loc: `${site}/topics/${row.topicKey}`,
        lastmod: typeof row.lastComputedAt === 'string' ? row.lastComputedAt : undefined,
        changefreq: 'daily',
        priority: 0.5,
      }))
    case 'threads':
      return rows.map((row) => ({
        loc: `${site}/threads/${row.$id}`,
        lastmod: row.$updatedAt ?? row.$createdAt,
        priority: 0.5,
      }))
    case 'users':
      return userEntries(rows)
  }
}

/**
 * People who have posted or commented. Profiles with no activity are thin, so
 * they're kept out (their pages are `noindex`).
 */
async function userEntries(profiles: Array<Row>): Promise<Array<SitemapEntry>> {
  const site = getSiteUrl()
  const entries: Array<SitemapEntry> = []
  for (const batch of chunk(profiles, ACTIVITY_CONCURRENCY)) {
    const activity = await Promise.all(batch.map((row) => activityOf(row.$id)))
    batch.forEach((row, index) => {
      const { stories, comments } = activity[index]
      if (!stories && !comments) return
      const lastmod = row.$updatedAt ?? row.$createdAt
      entries.push({ loc: `${site}/users/${row.$id}`, lastmod, changefreq: 'daily', priority: 0.4 })
      if (comments) entries.push({ loc: `${site}/users/${row.$id}/comments`, lastmod, priority: 0.3 })
    })
  }
  return entries
}

/** Whether someone has any stories or comments (one row each is enough). */
async function activityOf(userId: string): Promise<{ stories: boolean; comments: boolean }> {
  const { tables, ids } = db()
  const any = (tableId: string) =>
    tables
      .listRows({
        databaseId: ids.databaseId,
        tableId,
        queries: [Query.equal('userId', userId), Query.limit(1), Query.select(['$id'])],
        total: false,
      })
      .then((result) => result.rows.length > 0)
  const [stories, comments] = await Promise.all([any(ids.posts), any(ids.comments)])
  return { stories, comments }
}
