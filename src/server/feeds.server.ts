import {
  type FeedDocument,
  type FeedSource,
  feedPath,
  parseFeedPath,
  renderAtom,
  renderRss,
} from '@/lib/feeds'
import type { FeedPage, Post } from '@/lib/types'
import { getChannel, listChannelFeed } from './channels.server'
import { Query, listPostRows } from './db.server'
import { listDomainFeed } from './domains.server'
import { getSiteUrl } from './env.server'
import { listFeed, listUserPosts } from './posts.server'
import { getPeople } from './profiles.server'
import { getTopic, listTopicFeed } from './topics.server'

/** Rendered feeds are kept this long; readers poll often and the lists change slowly. */
const CACHE_MS = 10 * 60_000
const cache = new Map<string, { body: string; expires: number }>()

interface FeedList {
  title: string
  description: string
  /** Path of the HTML page the feed mirrors. */
  page: string
  feed: FeedPage
}

/** The list behind a feed, or null when it names something that doesn't exist. */
async function loadList(source: FeedSource): Promise<FeedList | null> {
  switch (source.kind) {
    case 'top':
      return {
        title: 'Refetch: Top stories',
        description: 'The best tech stories of the day, picked and voted on by the Refetch community.',
        page: '/',
        feed: await listFeed('top', 1),
      }
    case 'new':
      return {
        title: 'Refetch: Newest',
        description: 'The latest tech stories on Refetch, newest first.',
        page: '/new',
        feed: await listFeed('new', 1),
      }
    case 'show':
      return {
        title: 'Refetch: Show Refetch',
        description: 'Projects, launches and things people built, shared on Refetch.',
        page: '/show',
        feed: await listFeed('show', 1),
      }
    case 'channel': {
      const channel = await getChannel(source.id)
      if (!channel) return null
      return {
        title: `Refetch: ${channel.name}`,
        description: channel.description || `The latest ${channel.name} stories on Refetch.`,
        page: `/channels/${channel.id}`,
        feed: await listChannelFeed(channel, 'new', 1),
      }
    }
    case 'topic': {
      const { topic } = await getTopic(source.key)
      return {
        title: `Refetch: ${topic.label}`,
        description: `The latest ${topic.label} news and discussions on Refetch.`,
        page: `/topics/${topic.key}`,
        feed: await listTopicFeed(topic, 'new', 1),
      }
    }
    case 'user': {
      const [people, feed] = await Promise.all([
        getPeople([source.id]),
        // No viewer: an empty ID skips the vote lookup (undefined would mean the author).
        listUserPosts(source.id, 1, ''),
      ])
      const name = people.get(source.id)?.name ?? 'Refetch user'
      return {
        title: `Refetch: Stories shared by ${name}`,
        description: `Stories ${name} shared on Refetch.`,
        page: `/users/${source.id}`,
        feed,
      }
    }
    case 'domain':
      return {
        title: `Refetch: Stories from ${source.domain}`,
        description: `Stories from ${source.domain} shared and discussed on Refetch.`,
        page: `/from/${source.domain}`,
        feed: await listDomainFeed(source.domain, 'new', 1),
      }
  }
}

/** AI summaries aren't part of feed rows; fetch them for the posts in one query. */
async function summaries(posts: Array<Post>): Promise<Map<string, string>> {
  if (posts.length === 0) return new Map()
  const rows = await listPostRows([
    Query.equal(
      '$id',
      posts.map((post) => post.id),
    ),
    Query.limit(posts.length),
    Query.select(['$id', 'tldr']),
  ]).catch(() => [])
  return new Map(rows.map((row) => [row.$id, typeof row.tldr === 'string' ? row.tldr.trim() : ''] as const))
}

async function buildDocument(source: FeedSource, format: 'rss' | 'atom'): Promise<FeedDocument | null> {
  const list = await loadList(source)
  if (!list) return null
  const site = getSiteUrl()
  const tldrs = await summaries(list.feed.posts)
  return {
    title: list.title,
    description: list.description,
    pageUrl: `${site}${list.page}`,
    feedUrl: `${site}${feedPath(source, format)}`,
    siteUrl: site,
    entries: list.feed.posts.map((post) => {
      const threadUrl = `${site}/threads/${post.id}`
      return {
        id: post.id,
        title: post.title,
        threadUrl,
        link: post.link ?? threadUrl,
        summary: tldrs.get(post.id) || post.description,
        author: post.userName,
        points: post.count,
        comments: post.countComments,
        createdAt: post.createdAt,
        categories: post.channel ? [post.channel] : [],
      }
    }),
  }
}

/** `GET /feeds/<path>`: an RSS or Atom document, cached for a few minutes. */
export async function feedResponse(path: string): Promise<Response> {
  const parsed = parseFeedPath(path)
  if (!parsed) return new Response('Not found', { status: 404 })
  const type = parsed.format === 'atom' ? 'application/atom+xml' : 'application/rss+xml'
  const headers = {
    'Content-Type': `${type}; charset=utf-8`,
    'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
  }

  const key = `${parsed.format}:${feedPath(parsed.source, parsed.format)}`
  const hit = cache.get(key)
  if (hit && hit.expires > Date.now()) return new Response(hit.body, { headers })

  let body: string
  try {
    const doc = await buildDocument(parsed.source, parsed.format)
    if (!doc) return new Response('Not found', { status: 404 })
    body = parsed.format === 'atom' ? renderAtom(doc) : renderRss(doc)
  } catch (error) {
    console.error('[feeds] failed to build', path, error)
    if (hit) return new Response(hit.body, { headers })
    return new Response('Feed temporarily unavailable', { status: 503, headers: { 'Retry-After': '600' } })
  }
  cache.delete(key)
  cache.set(key, { body, expires: Date.now() + CACHE_MS })
  if (cache.size > 300) cache.delete(cache.keys().next().value!)
  return new Response(body, { headers })
}
