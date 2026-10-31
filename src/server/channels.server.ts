import { AppwriteException, ID } from 'node-appwrite'
import type {
  ActionResult,
  Channel,
  ChannelAbout,
  ChannelSource,
  ChannelSort,
  FeedPage,
  Post,
  SearchResult,
  SessionUser,
} from '@/lib/types'
import { FEED_MAX_PAGES, FEED_PAGE_SIZE } from '@/lib/constants'
import { hostnameOf } from '@/lib/url'
import bundled from '../../scripts/channels.json'
import { POST_LIST_FIELDS, Query, db, getUserVotes, listPostRows, toPost, type Row } from './db.server'
import { getBucketIds, getPublicConfig } from './env.server'
import { getFollowedIds } from './profiles.server'

const HOUR = 60 * 60 * 1000
const QUALITY = { maxSpamScore: 70, minRelevancyScore: 30 }

/* ─────────────────────────────── Catalog ─────────────────────────────── */

const CATALOG_TTL = 60_000
let catalog: { channels: Array<Channel>; expires: number } | null = null

/** Public URL of an icon in the channel-icons bucket. File IDs change with the content. */
function iconUrl(fileId: unknown): string | null {
  if (typeof fileId !== 'string' || !fileId) return null
  const { appwriteEndpoint, appwriteProjectId } = getPublicConfig()
  const bucketId = getBucketIds().channelIcons
  return `${appwriteEndpoint}/storage/buckets/${bucketId}/files/${encodeURIComponent(fileId)}/view?project=${appwriteProjectId}`
}

function toChannel(row: Pick<Row, '$id'> & Record<string, any>): Channel {
  return {
    id: row.$id,
    name: String(row.name ?? row.$id),
    category: typeof row.category === 'string' && row.category ? row.category : 'Other',
    glyph: String(row.glyph || String(row.name ?? '').slice(0, 2)),
    icon: iconUrl(row.icon),
    color: String(row.color || '#4e1cb3'),
    description: String(row.description ?? ''),
    keywords: Array.isArray(row.keywords) ? row.keywords.filter((k: unknown) => typeof k === 'string') : [],
    memberCount: typeof row.memberCount === 'number' ? Math.max(0, row.memberCount) : 0,
    verified: row.verified === true,
  }
}

/** The channel catalog (seeded by scripts/appwrite-setup.mjs), cached briefly. */
export async function listChannels(): Promise<Array<Channel>> {
  if (catalog && catalog.expires > Date.now()) return catalog.channels
  const { tables, ids } = db()
  try {
    const result = await tables.listRows({
      databaseId: ids.databaseId,
      tableId: ids.channels,
      queries: [
        Query.orderAsc('position'),
        Query.limit(100),
        Query.select([
          '$id',
          'name',
          'category',
          'glyph',
          'icon',
          'color',
          'description',
          'keywords',
          'memberCount',
          'verified',
        ]),
      ],
      total: false,
    })
    const channels = (result.rows as Array<Row>).map(toChannel)
    catalog = { channels, expires: Date.now() + CATALOG_TTL }
    return channels
  } catch (error) {
    if (catalog) return catalog.channels
    // Before `npm run appwrite:setup` creates the table, serve the bundled list so
    // channel pages still work through topic matching (joining needs the table).
    if (error instanceof AppwriteException && error.code === 404) {
      console.warn('[channels] channels table is missing, run `npm run appwrite:setup`')
      const channels = bundled.map((channel) => toChannel({ ...channel, $id: channel.id }))
      catalog = { channels, expires: Date.now() + CATALOG_TTL }
      return channels
    }
    console.error('[channels] failed to load the catalog', error)
    return []
  }
}

function invalidateCatalog() {
  catalog = null
}

export async function getChannel(id: string): Promise<Channel | null> {
  return (await listChannels()).find((channel) => channel.id === id) ?? null
}

/**
 * Stories without an explicit channel are matched by their AI topics. Topics are
 * listed most relevant first, so the first topic that names a channel wins.
 */
export function matchChannel(topics: unknown, channels: Array<Channel>): string | null {
  if (!Array.isArray(topics) || topics.length === 0) return null
  const byKeyword = new Map<string, string>()
  for (const channel of channels) {
    for (const keyword of channel.keywords) if (!byKeyword.has(keyword)) byKeyword.set(keyword, channel.id)
  }
  for (const topic of topics) {
    const id = typeof topic === 'string' ? byKeyword.get(topic) : undefined
    if (id) return id
  }
  return null
}

export async function withChannels(rows: Array<Row>, posts: Array<Post>): Promise<Array<Post>> {
  const channels = await listChannels()
  const known = new Set(channels.map((channel) => channel.id))
  return posts.map((post, i) => ({
    ...post,
    channel: post.channel && known.has(post.channel) ? post.channel : matchChannel(rows[i]?.topics, channels),
  }))
}

/** Turn a feed URL into something people can read and visit. */
function describeSource(url: string, official: boolean): ChannelSource | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const domain = parsed.hostname.replace(/^www\./, '')
  const github = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/releases\.atom$/)
  if (domain === 'github.com' && github) {
    return {
      label: `${github[1]}/${github[2]}`,
      href: `https://github.com/${github[1]}/${github[2]}/releases`,
      domain,
      official,
    }
  }
  const devTag = parsed.pathname.match(/^\/feed\/tag\/([^/]+)/)
  if (domain === 'dev.to' && devTag) {
    return { label: `DEV #${devTag[1]}`, href: `https://dev.to/t/${devTag[1]}`, domain, official }
  }
  const devUser = parsed.pathname.match(/^\/feed\/([^/]+)/)
  if (domain === 'dev.to' && devUser) {
    return { label: `DEV @${devUser[1]}`, href: `https://dev.to/${devUser[1]}`, domain, official }
  }
  return { label: domain, href: parsed.origin, domain, official }
}

const aboutCache = new Map<string, { about: ChannelAbout; expires: number }>()

/** Sources and recent activity for a channel's sidebar (cached for 10 minutes). */
export async function getChannelAbout(channel: Channel): Promise<ChannelAbout> {
  const hit = aboutCache.get(channel.id)
  if (hit && hit.expires > Date.now()) return hit.about
  const { tables, ids } = db()
  const [row, weekly] = await Promise.all([
    tables
      .getRow({
        databaseId: ids.databaseId,
        tableId: ids.channels,
        rowId: channel.id,
        queries: [Query.select(['sources', 'communitySources'])],
      })
      .catch(() => null),
    tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.posts,
        queries: [
          channelFilter([channel]),
          Query.greaterThan('$createdAt', new Date(Date.now() - 7 * 24 * HOUR).toISOString()),
          Query.limit(1),
          Query.select(['$id']),
        ],
        total: true,
      })
      .then((result) => result.total)
      .catch(() => 0),
  ])
  const urls = (value: unknown) =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  const seen = new Set<string>()
  const sources = [
    ...urls(row?.sources).map((url) => describeSource(url, true)),
    ...urls(row?.communitySources).map((url) => describeSource(url, false)),
  ].filter((source): source is ChannelSource => {
    if (!source || seen.has(source.href)) return false
    seen.add(source.href)
    return true
  })
  const about = { sources, weeklyStories: weekly }
  aboutCache.set(channel.id, { about, expires: Date.now() + 10 * 60_000 })
  return about
}

/* ──────────────────────────────── Membership ──────────────────────────────── */

export async function getJoinedChannelIds(userId: string): Promise<Array<string>> {
  const { tables, ids } = db()
  try {
    const result = await tables.listRows({
      databaseId: ids.databaseId,
      tableId: ids.channelMembers,
      queries: [Query.equal('userId', userId), Query.limit(100), Query.select(['channelId'])],
      total: false,
    })
    return (result.rows as Array<Row>).map((row) => String(row.channelId))
  } catch (error) {
    console.error('[channels] failed to load memberships', error)
    return []
  }
}

async function adjustMemberCount(channelId: string, delta: 1 | -1) {
  const { tables, ids } = db()
  try {
    const params = {
      databaseId: ids.databaseId,
      tableId: ids.channels,
      rowId: channelId,
      column: 'memberCount',
      value: 1,
    }
    if (delta > 0) await tables.incrementRowColumn(params)
    else await tables.decrementRowColumn({ ...params, min: 0 })
  } catch (error) {
    console.error('[channels] failed to update memberCount', error)
  }
  invalidateCatalog()
}

export async function joinChannel(user: SessionUser, channelId: string): Promise<ActionResult> {
  if (!(await getChannel(channelId))) return { ok: false, error: 'This channel doesn’t exist.' }
  const { tables, ids } = db()
  try {
    await tables.createRow({
      databaseId: ids.databaseId,
      tableId: ids.channelMembers,
      rowId: ID.unique(),
      data: { userId: user.id, channelId },
    })
  } catch (error) {
    // The unique (userId, channelId) index makes joining idempotent.
    if (error instanceof AppwriteException && error.code === 409) return { ok: true, data: undefined }
    throw error
  }
  await adjustMemberCount(channelId, 1)
  return { ok: true, data: undefined }
}

export async function leaveChannel(user: SessionUser, channelId: string): Promise<ActionResult> {
  const { tables, ids } = db()
  const result = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.channelMembers,
    queries: [Query.equal('userId', user.id), Query.equal('channelId', channelId), Query.limit(5)],
    total: false,
  })
  if (result.rows.length === 0) return { ok: true, data: undefined }
  await Promise.all(
    result.rows.map((row) =>
      tables.deleteRow({ databaseId: ids.databaseId, tableId: ids.channelMembers, rowId: row.$id }),
    ),
  )
  await adjustMemberCount(channelId, -1)
  return { ok: true, data: undefined }
}

/* ─────────────────────────────────── Feeds ─────────────────────────────────── */

/** Stories tagged with any of the channels, or whose AI topics match them. */
function channelFilter(channels: Array<Channel>) {
  const keywords = [...new Set(channels.flatMap((channel) => channel.keywords))]
  const byTag = Query.equal(
    'channel',
    channels.map((channel) => channel.id),
  )
  return keywords.length > 0 ? Query.or([byTag, Query.containsAny('topics', keywords)]) : byTag
}

/** A page of on-topic, enhanced stories matching `filters`, with votes and channels. */
export async function queryPosts(
  filters: Array<string>,
  order: Array<string>,
  page: number,
  userId?: string,
): Promise<FeedPage> {
  const all = await listPostRows([
    ...filters,
    Query.lessThan('spamScore', QUALITY.maxSpamScore),
    Query.greaterThan('relevancyScore', QUALITY.minRelevancyScore),
    Query.equal('enhanced', true),
    ...order,
    Query.limit(FEED_PAGE_SIZE + 1),
    Query.offset((page - 1) * FEED_PAGE_SIZE),
    Query.select(POST_LIST_FIELDS),
  ])
  const rows = all.slice(0, FEED_PAGE_SIZE)
  const votes = userId
    ? await getUserVotes(
        userId,
        'post',
        rows.map((row) => row.$id),
      )
    : null
  const posts = await withChannels(
    rows,
    rows.map((row) => toPost(row, votes?.get(row.$id) ?? null)),
  )
  return { posts, page, hasMore: all.length > FEED_PAGE_SIZE && page < FEED_MAX_PAGES }
}

export async function listChannelFeed(
  channel: Channel,
  sort: ChannelSort,
  page: number,
  userId?: string,
): Promise<FeedPage> {
  // Niche channels move slower than the front page, so look further back.
  const window = sort === 'hot' ? 7 * 24 * HOUR : 30 * 24 * HOUR
  return queryPosts(
    [Query.greaterThan('$createdAt', new Date(Date.now() - window).toISOString()), channelFilter([channel])],
    sort === 'hot'
      ? [Query.orderDesc('score'), Query.orderDesc('$createdAt')]
      : [Query.orderDesc('$createdAt')],
    page,
    userId,
  )
}

/** Stories from the channels a person has joined and the people they follow, best first. */
export async function listFollowingFeed(
  user: SessionUser,
  page: number,
): Promise<FeedPage & { joined: number }> {
  const [joinedIds, channels, followed] = await Promise.all([
    getJoinedChannelIds(user.id),
    listChannels(),
    getFollowedIds(user.id),
  ])
  const joined = channels.filter((channel) => joinedIds.includes(channel.id))
  const sources = [
    ...(joined.length > 0 ? [channelFilter(joined)] : []),
    ...(followed.length > 0 ? [Query.equal('userId', followed.slice(0, 100))] : []),
  ]
  const total = joined.length + followed.length
  if (sources.length === 0) return { posts: [], page, hasMore: false, joined: 0 }
  const feed = await queryPosts(
    [
      Query.greaterThan('$createdAt', new Date(Date.now() - 3 * 24 * HOUR).toISOString()),
      sources.length === 1 ? sources[0] : Query.or(sources),
    ],
    [Query.orderDesc('score'), Query.orderDesc('$createdAt')],
    page,
    user.id,
  )
  return { ...feed, joined: total }
}

/* ────────────────────────────────── Search ────────────────────────────────── */

export async function searchStories(term: string): Promise<Array<SearchResult>> {
  const query = term.trim()
  if (query.length < 2) return []
  const rows = await listPostRows([
    Query.search('title', query),
    Query.equal('enhanced', true),
    Query.lessThan('spamScore', QUALITY.maxSpamScore),
    Query.orderDesc('$createdAt'),
    Query.limit(8),
    Query.select(['$id', '$createdAt', 'title', 'link', 'channel', 'topics', 'count', 'countComments']),
  ])
  const channels = await listChannels()
  return rows.map((row) => ({
    id: row.$id,
    title: String(row.title ?? ''),
    domain: hostnameOf(typeof row.link === 'string' ? row.link : null),
    channel: (typeof row.channel === 'string' && row.channel) || matchChannel(row.topics, channels),
    count: typeof row.count === 'number' ? row.count : 0,
    countComments: typeof row.countComments === 'number' ? row.countComments : 0,
    createdAt: row.$createdAt,
  }))
}
