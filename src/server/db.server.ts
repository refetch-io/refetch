import { Query } from 'node-appwrite'
import type { Models } from 'node-appwrite'
import type { Comment, Post, PostDetail, ResourceType, Vote } from '@/lib/types'
import { hostnameOf } from '@/lib/url'
import { createAdminClient } from './appwrite.server'
import { getTableIds } from './env.server'

export { Query }

export type Row = Models.Row & Record<string, any>

export function db() {
  return { tables: createAdminClient().tables, ids: getTableIds() }
}

export function chunk<T>(items: Array<T>, size: number): Array<Array<T>> {
  const out: Array<Array<T>> = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

export const POST_LIST_FIELDS = [
  '$id',
  '$createdAt',
  'title',
  'description',
  'userId',
  'userName',
  'count',
  'countComments',
  'link',
  'type',
  'readingTime',
  'channel',
  'topics',
]

/** Columns added by the channels migration (scripts/appwrite-setup.mjs). */
const CHANNEL_COLUMNS = new Set(['channel'])
let channelColumnMissing = false

interface ParsedQuery {
  method: string
  attribute?: string
  values?: Array<any>
}

/**
 * Rewrite a query for a posts table without the channel columns. Selects drop
 * the column, `or` filters keep their topic matching, and a filter that only
 * targets a channel column can't match anything (null).
 */
function withoutChannelColumns(query: string): string | null {
  const parsed = JSON.parse(query) as ParsedQuery
  const usesChannel = (q: ParsedQuery) => Boolean(q.attribute && CHANNEL_COLUMNS.has(q.attribute))
  if (parsed.method === 'select') {
    return Query.select((parsed.values ?? []).filter((column: string) => !CHANNEL_COLUMNS.has(column)))
  }
  if (parsed.method === 'or') {
    const rest = (parsed.values ?? []).filter((q: ParsedQuery) => !usesChannel(q))
    if (rest.length === parsed.values?.length) return query
    if (rest.length === 0) return null
    return JSON.stringify(rest.length === 1 ? rest[0] : { ...parsed, values: rest })
  }
  return usesChannel(parsed) ? null : query
}

/**
 * List posts, tolerating a database where the channels migration hasn't run
 * yet: channel columns are dropped from the queries and we retry once.
 */
export async function listPostRows(queries: Array<string>): Promise<Array<Row>> {
  const { tables, ids } = db()
  const run = (list: Array<string>) =>
    tables
      .listRows({ databaseId: ids.databaseId, tableId: ids.posts, queries: list, total: false })
      .then((result) => result.rows as Array<Row>)

  const legacy = async (list: Array<string>) => {
    const rewritten = list.map(withoutChannelColumns)
    if (rewritten.includes(null)) return []
    return run(rewritten as Array<string>)
  }

  if (channelColumnMissing) return legacy(queries)
  try {
    return await run(queries)
  } catch (error) {
    if (!(error instanceof Error) || !/channel/i.test(error.message)) throw error
    console.warn('[db] posts.channel is missing, run `npm run appwrite:setup` to add channels')
    channelColumnMissing = true
    return legacy(queries)
  }
}

export const COMMENT_FIELDS = [
  '$id',
  '$createdAt',
  'postId',
  'userId',
  'userName',
  'content',
  'replyId',
  'count',
]

const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

export function toPost(row: Row, vote: Vote = null): Post {
  const link = typeof row.link === 'string' && /^https?:\/\//i.test(row.link) ? row.link : null
  return {
    id: row.$id,
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    link,
    domain: hostnameOf(link),
    type: row.type === 'show' ? 'show' : 'link',
    userId: String(row.userId ?? ''),
    userName: String(row.userName || 'Anonymous'),
    count: number(row.count),
    countComments: number(row.countComments),
    readingTime: typeof row.readingTime === 'number' && row.readingTime > 0 ? row.readingTime : null,
    createdAt: row.$createdAt,
    channel: typeof row.channel === 'string' && row.channel ? row.channel : null,
    vote,
  }
}

export function toPostDetail(row: Row, vote: Vote = null): PostDetail {
  return {
    ...toPost(row, vote),
    tldr: typeof row.tldr === 'string' && row.tldr.trim() ? row.tldr.trim() : null,
    topics: Array.isArray(row.topics)
      ? row.topics.filter((t: unknown) => typeof t === 'string' && t.trim())
      : [],
    readingLevel: typeof row.readingLevel === 'string' && row.readingLevel ? row.readingLevel : null,
  }
}

export function toComment(row: Row, vote: Vote = null): Comment {
  return {
    id: row.$id,
    postId: String(row.postId ?? ''),
    userId: String(row.userId ?? ''),
    userName: String(row.userName || 'Anonymous'),
    content: String(row.content ?? ''),
    replyId: typeof row.replyId === 'string' && row.replyId ? row.replyId : null,
    count: number(row.count),
    createdAt: row.$createdAt,
    vote,
  }
}

/** A vote row stores `count: 1` for an upvote and `count: -1` for a downvote. */
export function voteFromCount(count: unknown): Vote {
  return count === 1 ? 'up' : 'down'
}

/** Look up the user's votes for a set of resources, in parallel batches of 100. */
export async function getUserVotes(
  userId: string,
  resourceType: ResourceType,
  resourceIds: Array<string>,
): Promise<Map<string, Vote>> {
  const votes = new Map<string, Vote>()
  if (!userId || resourceIds.length === 0) return votes

  const { tables, ids } = db()
  const pages = await Promise.all(
    chunk(resourceIds, 100).map((batch) =>
      tables
        .listRows({
          databaseId: ids.databaseId,
          tableId: ids.votes,
          queries: [
            Query.equal('userId', userId),
            Query.equal('resourceType', resourceType),
            Query.equal('resourceId', batch),
            Query.limit(batch.length * 2),
            Query.select(['resourceId', 'count']),
          ],
          total: false,
        })
        .catch(() => ({ rows: [] as Array<Row> })),
    ),
  )

  for (const page of pages) {
    for (const row of page.rows as Array<Row>) {
      votes.set(String(row.resourceId), voteFromCount(row.count))
    }
  }
  return votes
}
