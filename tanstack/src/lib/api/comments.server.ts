import { getTablesDB, ID, Query, tables } from '../appwrite.server'
import { getTimeAgo } from '../utils'
import type { Comment } from '../types'

function mapComment(row: Record<string, unknown>): Comment {
  const createdAt = String(row.$createdAt ?? '')
  const replyId = String(row.replyId ?? '')
  return {
    id: String(row.$id),
    postId: String(row.postId ?? ''),
    author: String(row.userName ?? 'Anonymous'),
    userId: String(row.userId ?? ''),
    text: String(row.content ?? ''),
    count: Number(row.count ?? 0),
    countUp: Number(row.countUp ?? 0),
    countDown: Number(row.countDown ?? 0),
    parentId: replyId || undefined,
    createdAt,
    timeAgo: createdAt ? getTimeAgo(createdAt) : undefined,
    replies: [],
    currentVote: null,
  }
}

export function nestComments(flat: Comment[]): Comment[] {
  const byId = new Map<string, Comment>()
  for (const comment of flat) {
    byId.set(comment.id, { ...comment, replies: [] })
  }
  const roots: Comment[] = []
  for (const comment of byId.values()) {
    if (comment.parentId && byId.has(comment.parentId)) {
      byId.get(comment.parentId)!.replies!.push(comment)
    } else {
      roots.push(comment)
    }
  }

  const byCreatedAsc = (a: Comment, b: Comment) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  const byCreatedDesc = (a: Comment, b: Comment) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()

  const sortTree = (nodes: Comment[], childrenAsc: boolean) => {
    nodes.sort(childrenAsc ? byCreatedAsc : byCreatedDesc)
    for (const node of nodes) {
      if (node.replies?.length) sortTree(node.replies, true)
    }
  }
  sortTree(roots, false)
  return roots
}

export async function listComments(postId: string) {
  const db = getTablesDB()
  const result = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.comments(),
    queries: [
      Query.equal('postId', postId),
      Query.orderDesc('$createdAt'),
      Query.limit(500),
    ],
  })
  const flat = result.rows.map((row) =>
    mapComment(row as unknown as Record<string, unknown>),
  )
  return {
    data: nestComments(flat),
    flat,
    total: result.total,
  }
}

export async function createComment(input: {
  postId: string
  userId: string
  userName: string
  text: string
  replyId?: string
}) {
  const db = getTablesDB()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const recent = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.comments(),
    queries: [
      Query.equal('userId', input.userId),
      Query.greaterThan('$createdAt', oneHourAgo),
    ],
  })
  if (recent.rows.length >= 50) {
    throw Object.assign(
      new Error('Comment limit reached (50 comments per hour)'),
      { status: 429 },
    )
  }

  const row = await db.createRow({
    databaseId: tables.databaseId(),
    tableId: tables.comments(),
    rowId: ID.unique(),
    data: {
      postId: input.postId,
      userId: input.userId,
      userName: input.userName,
      content: input.text.trim(),
      replyId: input.replyId ?? '',
      count: 0,
      countUp: 0,
      countDown: 0,
      countReports: 0,
    },
  })

  await db.incrementRowColumn({
    databaseId: tables.databaseId(),
    tableId: tables.posts(),
    rowId: input.postId,
    column: 'countComments',
    value: 1,
  })

  return mapComment(row as unknown as Record<string, unknown>)
}

export async function deleteComment(commentId: string, userId: string) {
  const db = getTablesDB()
  const row = await db.getRow({
    databaseId: tables.databaseId(),
    tableId: tables.comments(),
    rowId: commentId,
  })
  if (row.userId !== userId) {
    throw Object.assign(new Error('Forbidden'), { status: 403 })
  }

  const replies = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.comments(),
    queries: [Query.equal('replyId', commentId), Query.limit(1)],
  })
  const hasReplies = replies.rows.length > 0

  // Keep thread structure when others already replied.
  if (hasReplies) {
    await db.updateRow({
      databaseId: tables.databaseId(),
      tableId: tables.comments(),
      rowId: commentId,
      data: {
        content: '[deleted]',
      },
    })
    return { soft: true as const }
  }

  await db.deleteRow({
    databaseId: tables.databaseId(),
    tableId: tables.comments(),
    rowId: commentId,
  })
  if (row.postId) {
    try {
      await db.decrementRowColumn({
        databaseId: tables.databaseId(),
        tableId: tables.posts(),
        rowId: String(row.postId),
        column: 'countComments',
        value: 1,
      })
    } catch {
      // post may already be gone
    }
  }
  return { soft: false as const }
}
