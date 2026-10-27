import { ID } from 'node-appwrite'
import type { ActionResult, FeedPage, FeedSort, SessionUser, Thread } from '@/lib/types'
import { FEED_MAX_PAGES, FEED_PAGE_SIZE } from '@/lib/constants'
import { cleanUrl } from '@/lib/url'
import { isNotFound } from './appwrite.server'
import {
  POST_LIST_FIELDS,
  Query,
  listCommentRows,
  listPostRows,
  db,
  getUserVotes,
  toComment,
  toPost,
  toPostDetail,
  type Row,
} from './db.server'
import { listChannels, matchChannel, withChannels } from './channels.server'

/** Quality gates shared with the ranking + topic-stats functions. */
const QUALITY = {
  maxSpamScore: 70,
  minRelevancyScore: 30,
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Abuse protection, unchanged from the original API. */
const MAX_SUBMISSIONS = 5
const SUBMISSION_WINDOW_HOURS = 16
const MAX_THREAD_COMMENTS = 500

function paginate(rows: Array<Row>, page: number) {
  return {
    rows: rows.slice(0, FEED_PAGE_SIZE),
    hasMore: rows.length > FEED_PAGE_SIZE && page < FEED_MAX_PAGES,
  }
}

/** Top / New / Show feeds: the last 24 hours of enhanced, on-topic posts. */
export async function listFeed(sort: FeedSort, page: number, userId?: string): Promise<FeedPage> {
  const since = new Date(Date.now() - DAY_MS).toISOString()

  const queries = [
    Query.greaterThan('$createdAt', since),
    Query.lessThan('spamScore', QUALITY.maxSpamScore),
    Query.greaterThan('relevancyScore', QUALITY.minRelevancyScore),
    Query.equal('enhanced', true),
  ]
  if (sort === 'show') queries.push(Query.equal('type', 'show'))
  if (sort === 'new') {
    queries.push(Query.orderDesc('$createdAt'))
  } else {
    queries.push(Query.orderDesc('score'), Query.orderDesc('$createdAt'))
  }
  queries.push(
    Query.limit(FEED_PAGE_SIZE + 1),
    Query.offset((page - 1) * FEED_PAGE_SIZE),
    Query.select(POST_LIST_FIELDS),
  )

  const { rows, hasMore } = paginate(await listPostRows(queries), page)
  const votes = userId
    ? await getUserVotes(
        userId,
        'post',
        rows.map((row) => row.$id),
      )
    : null
  return {
    posts: await withChannels(
      rows,
      rows.map((row) => toPost(row, votes?.get(row.$id) ?? null)),
    ),
    page,
    hasMore,
  }
}

/** Everything the signed-in user has submitted, newest first (no time window). */
/** Stories by `authorId`, with the viewer's votes (the author's own by default). */
export async function listUserPosts(
  authorId: string,
  page: number,
  viewerId: string | undefined = authorId,
): Promise<FeedPage> {
  const rows$ = await listPostRows([
    Query.equal('userId', authorId),
    Query.orderDesc('$createdAt'),
    Query.limit(FEED_PAGE_SIZE + 1),
    Query.offset((page - 1) * FEED_PAGE_SIZE),
    Query.select(POST_LIST_FIELDS),
  ])
  const { rows, hasMore } = paginate(rows$, page)
  const votes = viewerId
    ? await getUserVotes(
        viewerId,
        'post',
        rows.map((row) => row.$id),
      )
    : null
  return {
    posts: await withChannels(
      rows,
      rows.map((row) => toPost(row, votes?.get(row.$id) ?? null)),
    ),
    page,
    hasMore,
  }
}

export async function getThread(postId: string, userId?: string): Promise<Thread | null> {
  const { tables, ids } = db()

  const [postRow, commentRows] = await Promise.all([
    tables
      .getRow({ databaseId: ids.databaseId, tableId: ids.posts, rowId: postId })
      .catch((error: unknown) => {
        if (isNotFound(error)) return null
        throw error
      }),
    listCommentRows([
      Query.equal('postId', postId),
      Query.orderDesc('$createdAt'),
      Query.limit(MAX_THREAD_COMMENTS),
    ]),
  ])

  if (!postRow) return null

  const [postVotes, commentVotes] = userId
    ? await Promise.all([
        getUserVotes(userId, 'post', [postId]),
        getUserVotes(
          userId,
          'comment',
          commentRows.map((row) => row.$id),
        ),
      ])
    : [null, null]

  return {
    post: await withChannelDetail(
      postRow as Row,
      toPostDetail(postRow as Row, postVotes?.get(postId) ?? null),
    ),
    comments: commentRows.map((row) => toComment(row, commentVotes?.get(row.$id) ?? null)),
  }
}

/** Lightweight lookup used for metadata and social images. */
export async function getPostById(postId: string) {
  const { tables, ids } = db()
  try {
    const row = await tables.getRow({ databaseId: ids.databaseId, tableId: ids.posts, rowId: postId })
    return withChannelDetail(row as Row, toPostDetail(row as Row))
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

async function withChannelDetail<T extends { channel: string | null }>(row: Row, post: T): Promise<T> {
  const channels = await listChannels()
  const known = post.channel && channels.some((channel) => channel.id === post.channel)
  return { ...post, channel: known ? post.channel : matchChannel(row.topics, channels) }
}

export interface SubmitInput {
  title: string
  url: string
  comment?: string
  channel?: string
}

export async function createPost(
  user: SessionUser,
  input: SubmitInput,
): Promise<ActionResult<{ id: string }>> {
  const { tables, ids } = db()
  const link = cleanUrl(input.url.trim())
  if (input.channel && !(await listChannels()).some((channel) => channel.id === input.channel)) {
    return { ok: false, error: 'Pick a channel from the list.' }
  }

  const windowStart = new Date(Date.now() - SUBMISSION_WINDOW_HOURS * 60 * 60 * 1000).toISOString()
  const [recent, duplicate] = await Promise.all([
    tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.posts,
        queries: [
          Query.equal('userId', user.id),
          Query.greaterThan('$createdAt', windowStart),
          Query.limit(MAX_SUBMISSIONS + 1),
          Query.select(['$id']),
        ],
        total: false,
      })
      .then((result) => result.rows.length)
      // If the check fails, don't block legitimate users.
      .catch(() => 0),
    tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.posts,
        queries: [Query.equal('link', link), Query.limit(1), Query.select(['$id'])],
        total: false,
      })
      .then((result) => result.rows[0]?.$id as string | undefined)
      .catch(() => undefined),
  ])

  if (recent >= MAX_SUBMISSIONS) {
    return {
      ok: false,
      code: 'rate_limited',
      error: `You can submit up to ${MAX_SUBMISSIONS} stories every ${SUBMISSION_WINDOW_HOURS} hours. Please try again later.`,
    }
  }
  if (duplicate) {
    return {
      ok: false,
      code: 'duplicate',
      error: 'This story has already been shared.',
      existingId: duplicate,
    }
  }

  const userName = user.name || user.email || 'Anonymous'
  const description = input.comment?.trim() ?? ''

  const post = await tables.createRow({
    databaseId: ids.databaseId,
    tableId: ids.posts,
    rowId: ID.unique(),
    data: {
      title: input.title.trim(),
      description,
      userId: user.id,
      userName,
      count: 0,
      countUp: 0,
      countDown: 0,
      type: 'link',
      enhanced: false, // flipped by the Enhancement function
      timeScore: 100, // new posts start with the maximum time score
      link,
      ...(input.channel ? { channel: input.channel } : {}),
    },
  })

  // The submitter's note becomes the first comment of the discussion.
  if (description) {
    try {
      await tables.createRow({
        databaseId: ids.databaseId,
        tableId: ids.comments,
        rowId: ID.unique(),
        data: {
          postId: post.$id,
          userId: user.id,
          userName,
          content: description.length > 2000 ? `${description.slice(0, 1997)}...` : description,
          replyId: '',
          countReports: 0,
        },
      })
      await tables.updateRow({
        databaseId: ids.databaseId,
        tableId: ids.posts,
        rowId: post.$id,
        data: { countComments: 1 },
      })
    } catch (error) {
      console.error('Failed to create the submission comment', error)
    }
  }

  return { ok: true, data: { id: post.$id } }
}

export async function removePost(user: SessionUser, postId: string): Promise<ActionResult> {
  const { tables, ids } = db()
  let post: Row
  try {
    post = (await tables.getRow({ databaseId: ids.databaseId, tableId: ids.posts, rowId: postId })) as Row
  } catch (error) {
    if (isNotFound(error)) return { ok: false, error: 'This story no longer exists.' }
    throw error
  }
  if (post.userId !== user.id) {
    return { ok: false, error: 'You can only delete your own stories.' }
  }
  await tables.deleteRow({ databaseId: ids.databaseId, tableId: ids.posts, rowId: postId })
  return { ok: true, data: undefined }
}
