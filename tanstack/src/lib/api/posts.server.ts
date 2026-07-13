import { QUALITY_THRESHOLDS } from '../env'
import { getDomain, getTimeAgo } from '../utils'
import { getTablesDB, Query, tables } from '../appwrite.server'
import type { Paginated, Post, SortType } from '../types'

function mapPost(row: Record<string, unknown>): Post {
  const link = typeof row.link === 'string' ? row.link : undefined
  const createdAt = String(row.$createdAt ?? '')
  return {
    id: String(row.$id),
    title: String(row.title ?? ''),
    description: String(row.description ?? ''),
    tldr: typeof row.tldr === 'string' ? row.tldr : undefined,
    link,
    domain: getDomain(link),
    author: String(row.userName ?? 'Anonymous'),
    userId: String(row.userId ?? ''),
    count: Number(row.count ?? 0),
    countUp: Number(row.countUp ?? 0),
    countDown: Number(row.countDown ?? 0),
    countComments: Number(row.countComments ?? 0),
    type: String(row.type ?? 'link'),
    readingTime:
      typeof row.readingTime === 'number' ? row.readingTime : undefined,
    spamScore: typeof row.spamScore === 'number' ? row.spamScore : undefined,
    createdAt,
    updatedAt: String(row.$updatedAt ?? ''),
    timeAgo: createdAt ? getTimeAgo(createdAt) : undefined,
    currentVote: null,
  }
}

const POST_SELECT = [
  '$id',
  'title',
  'description',
  'tldr',
  'userId',
  'userName',
  'countUp',
  'countDown',
  'count',
  'countComments',
  'link',
  'type',
  'readingTime',
  'spamScore',
  '$createdAt',
  '$updatedAt',
]

export async function listPosts(options: {
  sort?: SortType
  limit?: number
  offset?: number
  userId?: string
  feedWindow?: boolean
  /** ISO timestamp — only return posts created after this time. */
  since?: string
}): Promise<Paginated<Post>> {
  const sort = options.sort ?? 'score'
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
  const offset = Math.max(options.offset ?? 0, 0)
  const feedWindow = options.feedWindow ?? sort !== 'mines'

  const queries = [Query.limit(limit), Query.offset(offset), Query.select(POST_SELECT)]

  if (options.since) {
    queries.push(Query.greaterThan('$createdAt', options.since))
  }

  if (feedWindow) {
    const twentyFourHoursAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString()
    queries.push(Query.greaterThan('$createdAt', twentyFourHoursAgo))
    queries.push(Query.lessThan('spamScore', QUALITY_THRESHOLDS.MAX_SPAM_SCORE))
    queries.push(
      Query.greaterThan(
        'relevancyScore',
        QUALITY_THRESHOLDS.MIN_RELEVANCY_SCORE,
      ),
    )
    queries.push(Query.equal('enhanced', QUALITY_THRESHOLDS.REQUIRE_ENHANCED))
  }

  if (options.userId) {
    queries.push(Query.equal('userId', options.userId))
  }

  // When checking for newer posts, always order by creation time.
  if (options.since) {
    queries.push(Query.orderDesc('$createdAt'))
  } else {
    switch (sort) {
      case 'new':
        queries.push(Query.orderDesc('$createdAt'))
        break
      case 'show':
        queries.push(Query.equal('type', 'show'))
        queries.push(Query.orderDesc('score'))
        queries.push(Query.orderDesc('$createdAt'))
        break
      case 'mines':
        queries.push(Query.orderDesc('$createdAt'))
        break
      case 'score':
      default:
        queries.push(Query.orderDesc('score'))
        queries.push(Query.orderDesc('$createdAt'))
        break
    }
  }

  // Keep show-type filter when polling the Show feed.
  if (options.since && sort === 'show') {
    queries.push(Query.equal('type', 'show'))
  }

  const db = getTablesDB()
  const result = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.posts(),
    queries,
  })

  return {
    data: result.rows.map((row) => mapPost(row as unknown as Record<string, unknown>)),
    total: result.total,
    limit,
    offset,
  }
}

/** Full-text search posts via Appwrite (requires a fulltext index on `title`). */
export async function searchPosts(options: {
  q: string
  limit?: number
}): Promise<Paginated<Post>> {
  const raw = options.q.trim()
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50)

  if (raw.length < 3) {
    return { data: [], total: 0, limit, offset: 0 }
  }

  // Hyphens are stop characters — quote the term for exact-ish matches.
  const searchValue = /[-+]/.test(raw) ? `"${raw}"` : raw

  const queries = [
    Query.search('title', searchValue),
    Query.limit(limit),
    Query.orderDesc('$createdAt'),
    Query.select(POST_SELECT),
  ]

  const db = getTablesDB()
  const result = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.posts(),
    queries,
  })

  return {
    data: result.rows.map((row) =>
      mapPost(row as unknown as Record<string, unknown>),
    ),
    total: result.total,
    limit,
    offset: 0,
  }
}

export async function getPost(postId: string): Promise<Post | null> {
  try {
    const db = getTablesDB()
    const row = await db.getRow({
      databaseId: tables.databaseId(),
      tableId: tables.posts(),
      rowId: postId,
    })
    return mapPost(row as unknown as Record<string, unknown>)
  } catch {
    return null
  }
}

export async function createPost(input: {
  title: string
  url?: string
  description?: string
  type: 'link' | 'show'
  userId: string
  userName: string
}) {
  const db = getTablesDB()
  const { ID } = await import('node-appwrite')
  const cleanedLink = input.url ? cleanUrlRequired(input.url) : undefined

  if (cleanedLink) {
    const existing = await db.listRows({
      databaseId: tables.databaseId(),
      tableId: tables.posts(),
      queries: [Query.equal('link', cleanedLink), Query.limit(1)],
    })
    if (existing.rows.length > 0) {
      throw Object.assign(new Error('A post with this URL already exists'), {
        status: 409,
      })
    }
  }

  const sixteenHoursAgo = new Date(
    Date.now() - 16 * 60 * 60 * 1000,
  ).toISOString()
  const recent = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.posts(),
    queries: [
      Query.equal('userId', input.userId),
      Query.greaterThan('$createdAt', sixteenHoursAgo),
    ],
  })
  if (recent.rows.length >= 5) {
    throw Object.assign(
      new Error('Submission limit reached (5 posts per 16 hours)'),
      { status: 429 },
    )
  }

  const row = await db.createRow({
    databaseId: tables.databaseId(),
    tableId: tables.posts(),
    rowId: ID.unique(),
    data: {
      title: input.title.trim(),
      description: (input.description ?? '').trim(),
      link: cleanedLink,
      userId: input.userId,
      userName: input.userName,
      count: 0,
      countUp: 0,
      countDown: 0,
      countComments: 0,
      type: input.type,
      enhanced: false,
      timeScore: 100,
    },
  })

  if (input.description?.trim()) {
    await db.createRow({
      databaseId: tables.databaseId(),
      tableId: tables.comments(),
      rowId: ID.unique(),
      data: {
        postId: row.$id,
        userId: input.userId,
        userName: input.userName,
        content: input.description.trim().slice(0, 2000),
        replyId: '',
        count: 0,
        countUp: 0,
        countDown: 0,
        countReports: 0,
      },
    })
    await db.updateRow({
      databaseId: tables.databaseId(),
      tableId: tables.posts(),
      rowId: row.$id,
      data: { countComments: 1 },
    })
  }

  return mapPost(row as unknown as Record<string, unknown>)
}

export async function deletePost(postId: string, userId: string) {
  const post = await getPost(postId)
  if (!post) {
    throw Object.assign(new Error('Post not found'), { status: 404 })
  }
  if (post.userId !== userId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }
  const db = getTablesDB()
  await db.deleteRow({
    databaseId: tables.databaseId(),
    tableId: tables.posts(),
    rowId: postId,
  })
}

function cleanUrlRequired(url: string) {
  try {
    const urlObj = new URL(url)
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
  } catch {
    throw Object.assign(new Error('Invalid URL'), { status: 400 })
  }
}
