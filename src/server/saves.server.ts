import { AppwriteException, ID } from 'node-appwrite'
import type { ActionResult, FeedPage, SessionUser } from '@/lib/types'
import { FEED_MAX_PAGES, FEED_PAGE_SIZE } from '@/lib/constants'
import { isNotFound } from './appwrite.server'
import { withChannels } from './channels.server'
import { POST_LIST_FIELDS, Query, db, getUserVotes, listPostRows, toPost, type Row } from './db.server'

/** Most saves a person can keep (the Saved page and the bookmark states read them all). */
const MAX_SAVES = 1000

function missingTable(error: unknown) {
  // The table is created by `appwrite:setup`; until then nobody has saved anything.
  return isNotFound(error)
}

/** IDs of every story someone saved, newest first. */
export async function getSavedIds(userId: string): Promise<Array<string>> {
  const { tables, ids } = db()
  const result = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.saves,
      queries: [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(MAX_SAVES),
        Query.select(['postId']),
      ],
      total: false,
    })
    .catch((error: unknown) => {
      if (missingTable(error)) return { rows: [] as Array<Row> }
      throw error
    })
  return (result.rows as Array<Row>).map((row) => String(row.postId))
}

export async function setSaved(user: SessionUser, postId: string, saved: boolean): Promise<ActionResult> {
  const { tables, ids } = db()
  const existing = await tables.listRows({
    databaseId: ids.databaseId,
    tableId: ids.saves,
    queries: [Query.equal('userId', user.id), Query.equal('postId', postId), Query.limit(5)],
    total: false,
  })

  if (saved && existing.rows.length === 0) {
    const [post, count] = await Promise.all([
      tables
        .getRow({
          databaseId: ids.databaseId,
          tableId: ids.posts,
          rowId: postId,
          queries: [Query.select(['$id'])],
        })
        .catch((error: unknown) => {
          if (isNotFound(error)) return null
          throw error
        }),
      tables
        .listRows({
          databaseId: ids.databaseId,
          tableId: ids.saves,
          queries: [Query.equal('userId', user.id), Query.limit(1)],
          total: true,
        })
        .then((result) => result.total),
    ])
    if (!post) return { ok: false, error: 'This story no longer exists.' }
    if (count >= MAX_SAVES) {
      return { ok: false, error: `You can keep up to ${MAX_SAVES} saved stories. Remove a few first.` }
    }
    await tables
      .createRow({
        databaseId: ids.databaseId,
        tableId: ids.saves,
        rowId: ID.unique(),
        data: { userId: user.id, postId },
      })
      .catch((error: unknown) => {
        // 409: saved twice at once (unique index).
        if (!(error instanceof AppwriteException && error.code === 409)) throw error
      })
  }

  if (!saved) {
    await Promise.all(
      existing.rows.map((row) =>
        tables.deleteRow({ databaseId: ids.databaseId, tableId: ids.saves, rowId: row.$id }),
      ),
    )
  }
  return { ok: true, data: undefined }
}

/** Saved stories, most recently saved first. Stories deleted since are skipped. */
export async function listSavedPosts(userId: string, page: number): Promise<FeedPage> {
  const { tables, ids } = db()
  const saves = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.saves,
      queries: [
        Query.equal('userId', userId),
        Query.orderDesc('$createdAt'),
        Query.limit(FEED_PAGE_SIZE + 1),
        Query.offset((page - 1) * FEED_PAGE_SIZE),
        Query.select(['postId']),
      ],
      total: false,
    })
    .then((result) => result.rows as Array<Row>)
    .catch((error: unknown) => {
      if (missingTable(error)) return [] as Array<Row>
      throw error
    })

  const postIds = saves.slice(0, FEED_PAGE_SIZE).map((row) => String(row.postId))
  const hasMore = saves.length > FEED_PAGE_SIZE && page < FEED_MAX_PAGES
  if (postIds.length === 0) return { posts: [], page, hasMore: false }

  const found = await listPostRows([
    Query.equal('$id', postIds),
    Query.limit(postIds.length),
    Query.select(POST_LIST_FIELDS),
  ])
  const byId = new Map(found.map((row) => [row.$id, row]))
  const rows = postIds.map((id) => byId.get(id)).filter((row): row is Row => Boolean(row))
  const votes = await getUserVotes(
    userId,
    'post',
    rows.map((row) => row.$id),
  )
  return {
    posts: await withChannels(
      rows,
      rows.map((row) => toPost(row, votes.get(row.$id) ?? null)),
    ),
    page,
    hasMore,
  }
}
