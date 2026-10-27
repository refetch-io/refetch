import { ID } from 'node-appwrite'
import type { ActionResult, Comment, SessionUser } from '@/lib/types'
import { COMMENT_EDIT_WINDOW_MS, MAX_COMMENT_DEPTH } from '@/lib/constants'
import { isNotFound } from './appwrite.server'
import { Query, db, toComment, type Row } from './db.server'
import { notify } from './notifications.server'

/** Abuse protection, unchanged from the original API. */
const MAX_COMMENTS_PER_HOUR = 50

export interface NewComment {
  postId: string
  content: string
  replyId?: string
}

async function commentDepth(commentId: string): Promise<number | null> {
  const { tables, ids } = db()
  let depth = 0
  let currentId: string | null = commentId
  // Walk up the reply chain; we only care whether it is deeper than the limit.
  while (currentId && depth <= MAX_COMMENT_DEPTH) {
    let row: Row
    try {
      row = (await tables.getRow({
        databaseId: ids.databaseId,
        tableId: ids.comments,
        rowId: currentId,
        queries: [Query.select(['$id', 'replyId'])],
      })) as Row
    } catch (error) {
      if (isNotFound(error)) return depth === 0 ? null : depth - 1
      throw error
    }
    currentId = typeof row.replyId === 'string' && row.replyId ? row.replyId : null
    if (currentId) depth += 1
  }
  return depth
}

export async function createComment(user: SessionUser, input: NewComment): Promise<ActionResult<Comment>> {
  const { tables, ids } = db()
  const content = input.content.trim()
  if (!content) return { ok: false, error: 'Write something first.' }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const [recentCount, post, parentDepth, parent] = await Promise.all([
    tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.comments,
        queries: [
          Query.equal('userId', user.id),
          Query.greaterThan('$createdAt', oneHourAgo),
          Query.limit(MAX_COMMENTS_PER_HOUR + 1),
          Query.select(['$id']),
        ],
        total: false,
      })
      .then((result) => result.rows.length)
      .catch(() => 0),
    tables
      .getRow({
        databaseId: ids.databaseId,
        tableId: ids.posts,
        rowId: input.postId,
        queries: [Query.select(['$id', 'userId', 'title'])],
      })
      .then((row) => row as Row)
      .catch((error: unknown) => {
        if (isNotFound(error)) return null
        throw error
      }),
    input.replyId ? commentDepth(input.replyId) : Promise.resolve(0),
    input.replyId
      ? tables
          .getRow({
            databaseId: ids.databaseId,
            tableId: ids.comments,
            rowId: input.replyId,
            queries: [Query.select(['$id', 'userId'])],
          })
          .then((row) => row as Row)
          .catch(() => null)
      : Promise.resolve(null),
  ])

  if (!post) return { ok: false, error: 'This story no longer exists.' }
  if (recentCount >= MAX_COMMENTS_PER_HOUR) {
    return {
      ok: false,
      code: 'rate_limited',
      error: `You can post up to ${MAX_COMMENTS_PER_HOUR} comments per hour. Take a breather and try again soon.`,
    }
  }
  if (input.replyId && parentDepth === null) {
    return { ok: false, error: 'The comment you are replying to was deleted.' }
  }
  if (input.replyId && (parentDepth ?? 0) >= MAX_COMMENT_DEPTH) {
    return { ok: false, error: 'This thread is too deep to reply to.' }
  }

  const row = await tables.createRow({
    databaseId: ids.databaseId,
    tableId: ids.comments,
    rowId: ID.unique(),
    data: {
      postId: input.postId,
      userId: user.id,
      userName: user.name || 'Anonymous',
      content,
      replyId: input.replyId ?? '',
      countReports: 0,
    },
  })

  try {
    await tables.incrementRowColumn({
      databaseId: ids.databaseId,
      tableId: ids.posts,
      rowId: input.postId,
      column: 'countComments',
      value: 1,
    })
  } catch (error) {
    // The comment exists either way; the counter is best-effort.
    console.error('Failed to increment countComments', error)
  }

  // Replies notify the parent's author; top-level comments notify the story's.
  await notify({
    recipientId: String((parent ?? post).userId ?? ''),
    type: parent ? 'reply' : 'comment',
    actor: { id: user.id, name: user.name || 'Anonymous' },
    postId: input.postId,
    postTitle: String(post.title ?? ''),
    commentId: row.$id,
    preview: content,
  })

  return { ok: true, data: toComment(row as Row) }
}

export async function removeComment(user: SessionUser, commentId: string): Promise<ActionResult> {
  const { tables, ids } = db()
  let comment: Row
  try {
    comment = (await tables.getRow({
      databaseId: ids.databaseId,
      tableId: ids.comments,
      rowId: commentId,
    })) as Row
  } catch (error) {
    if (isNotFound(error)) return { ok: false, error: 'This comment no longer exists.' }
    throw error
  }

  if (comment.userId !== user.id) {
    return { ok: false, error: 'You can only delete your own comments.' }
  }

  await tables.deleteRow({ databaseId: ids.databaseId, tableId: ids.comments, rowId: commentId })

  try {
    await tables.decrementRowColumn({
      databaseId: ids.databaseId,
      tableId: ids.posts,
      rowId: String(comment.postId),
      column: 'countComments',
      value: 1,
      min: 0,
    })
  } catch (error) {
    console.error('Failed to decrement countComments', error)
  }

  return { ok: true, data: undefined }
}

/** Authors can fix their own comment for a while after posting it. */
export async function editComment(
  user: SessionUser,
  commentId: string,
  content: string,
): Promise<ActionResult<Comment>> {
  const { tables, ids } = db()
  const text = content.trim()
  if (!text) return { ok: false, error: 'Write something first.' }

  let comment: Row
  try {
    comment = (await tables.getRow({
      databaseId: ids.databaseId,
      tableId: ids.comments,
      rowId: commentId,
    })) as Row
  } catch (error) {
    if (isNotFound(error)) return { ok: false, error: 'This comment no longer exists.' }
    throw error
  }

  if (comment.userId !== user.id) return { ok: false, error: 'You can only edit your own comments.' }
  if (Date.now() - new Date(comment.$createdAt).getTime() > COMMENT_EDIT_WINDOW_MS) {
    return { ok: false, error: 'Comments can only be edited during the first hour.' }
  }
  if (text === comment.content) return { ok: true, data: toComment(comment) }

  const row = await tables.updateRow({
    databaseId: ids.databaseId,
    tableId: ids.comments,
    rowId: commentId,
    data: { content: text, editedAt: new Date().toISOString() },
  })
  return { ok: true, data: toComment(row as Row) }
}
