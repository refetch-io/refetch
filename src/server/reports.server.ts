import { AppwriteException, ID } from 'node-appwrite'
import type { ActionResult, ResourceType, SessionUser } from '@/lib/types'
import { groupReports, type ModerationItem, type ReportReason } from '@/lib/reports'
import { isNotFound } from './appwrite.server'
import { Query, chunk, db, type Row } from './db.server'

/** Abuse protection for the report button itself. */
const MAX_REPORTS_PER_HOUR = 20
/** Oldest open reports the queue loads at once. */
const QUEUE_LIMIT = 500

export interface NewReport {
  resourceType: ResourceType
  resourceId: string
  reason: ReportReason
  note?: string
}

function tableFor(resourceType: ResourceType) {
  const { ids } = db()
  return resourceType === 'post' ? ids.posts : ids.comments
}

export async function createReport(user: SessionUser, input: NewReport): Promise<ActionResult> {
  const { tables, ids } = db()
  const noun = input.resourceType === 'post' ? 'story' : 'comment'
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const [resource, recent] = await Promise.all([
    tables
      .getRow({
        databaseId: ids.databaseId,
        tableId: tableFor(input.resourceType),
        rowId: input.resourceId,
        queries: [
          Query.select(input.resourceType === 'post' ? ['$id', 'userId'] : ['$id', 'userId', 'postId']),
        ],
      })
      .then((row) => row as Row)
      .catch((error: unknown) => {
        if (isNotFound(error)) return null
        throw error
      }),
    tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.reports,
        queries: [
          Query.equal('reporterId', user.id),
          Query.greaterThan('$createdAt', oneHourAgo),
          Query.limit(MAX_REPORTS_PER_HOUR + 1),
          Query.select(['$id']),
        ],
        total: false,
      })
      .then((result) => result.rows.length)
      .catch(() => 0),
  ])

  if (!resource) return { ok: false, error: `This ${noun} no longer exists.` }
  if (resource.userId === user.id) return { ok: false, error: `You can’t report your own ${noun}.` }
  if (recent >= MAX_REPORTS_PER_HOUR) {
    return { ok: false, code: 'rate_limited', error: 'You’ve sent a lot of reports. Try again in a while.' }
  }

  try {
    await tables.createRow({
      databaseId: ids.databaseId,
      tableId: ids.reports,
      rowId: ID.unique(),
      data: {
        reporterId: user.id,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        postId: input.resourceType === 'post' ? input.resourceId : String(resource.postId ?? ''),
        reason: input.reason,
        note: input.note?.trim() ?? '',
        status: 'open',
      },
    })
  } catch (error) {
    // 409: they already reported it (unique index); that's fine.
    if (error instanceof AppwriteException && error.code === 409) return { ok: true, data: undefined }
    throw error
  }

  try {
    await tables.incrementRowColumn({
      databaseId: ids.databaseId,
      tableId: tableFor(input.resourceType),
      rowId: input.resourceId,
      column: 'countReports',
      value: 1,
    })
  } catch (error) {
    console.error('Failed to increment countReports', error)
  }
  return { ok: true, data: undefined }
}

/** Rows by ID from one table, in batches. */
async function rowsById(tableId: string, rowIds: Array<string>, columns: Array<string>) {
  const { tables, ids } = db()
  const found = new Map<string, Row>()
  for (const batch of chunk([...new Set(rowIds)], 100)) {
    const result = await tables.listRows({
      databaseId: ids.databaseId,
      tableId,
      queries: [Query.equal('$id', batch), Query.limit(batch.length), Query.select(columns)],
      total: false,
    })
    for (const row of result.rows as Array<Row>) found.set(row.$id, row)
  }
  return found
}

/** Open reports rolled up per story or comment, most reported first. */
export async function listModerationQueue(): Promise<Array<ModerationItem>> {
  const { tables, ids } = db()
  const reports = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.reports,
      queries: [Query.equal('status', 'open'), Query.orderDesc('$createdAt'), Query.limit(QUEUE_LIMIT)],
      total: false,
    })
    .then((result) => result.rows as Array<Row>)
    .catch((error: unknown) => {
      if (isNotFound(error)) return [] as Array<Row>
      throw error
    })

  const groups = groupReports(
    reports.map((row) => ({
      resourceType: row.resourceType === 'post' ? 'post' : 'comment',
      resourceId: String(row.resourceId),
      postId: typeof row.postId === 'string' && row.postId ? row.postId : null,
      reason: String(row.reason ?? ''),
      note: String(row.note ?? ''),
      createdAt: row.$createdAt,
    })),
  )

  const commentIds = groups.filter((g) => g.resourceType === 'comment').map((g) => g.resourceId)
  const postIds = groups.map((g) => g.postId).filter((id): id is string => Boolean(id))
  const [comments, posts] = await Promise.all([
    rowsById(ids.comments, commentIds, ['$id', '$createdAt', 'content', 'userId', 'userName', 'postId']),
    rowsById(ids.posts, postIds, ['$id', '$createdAt', 'title', 'link', 'userId', 'userName']),
  ])

  return groups.map((group) => {
    const post = group.postId ? posts.get(group.postId) : undefined
    const row = group.resourceType === 'post' ? post : comments.get(group.resourceId)
    return {
      ...group,
      postTitle: post ? String(post.title ?? '') : null,
      body: row ? String((group.resourceType === 'post' ? row.link : row.content) ?? '') || null : null,
      author: row ? { id: String(row.userId), name: String(row.userName || 'Refetch user') } : null,
      createdAt: row?.$createdAt ?? null,
      exists: Boolean(row),
    }
  })
}

/** Stories and comments with open reports: the length of the moderation queue. */
export async function countModerationQueue(): Promise<number> {
  const { tables, ids } = db()
  const reports = await tables
    .listRows({
      databaseId: ids.databaseId,
      tableId: ids.reports,
      queries: [
        Query.equal('status', 'open'),
        Query.limit(QUEUE_LIMIT),
        Query.select(['resourceType', 'resourceId']),
      ],
      total: false,
    })
    .then((result) => result.rows as Array<Row>)
    .catch((error: unknown) => {
      if (isNotFound(error)) return [] as Array<Row>
      throw error
    })
  return new Set(reports.map((row) => `${row.resourceType}:${row.resourceId}`)).size
}

export type ModerationAction = 'dismiss' | 'remove'

/** Remove the content (or keep it) and close every open report about it. */
export async function resolveReports(
  moderator: SessionUser,
  resourceType: ResourceType,
  resourceId: string,
  action: ModerationAction,
): Promise<ActionResult> {
  const { tables, ids } = db()

  if (action === 'remove') {
    const tableId = tableFor(resourceType)
    const row = await tables
      .getRow({
        databaseId: ids.databaseId,
        tableId,
        rowId: resourceId,
        queries: [Query.select(resourceType === 'comment' ? ['$id', 'postId'] : ['$id'])],
      })
      .then((found) => found as Row)
      .catch((error: unknown) => {
        if (isNotFound(error)) return null
        throw error
      })
    if (row) {
      await tables.deleteRow({ databaseId: ids.databaseId, tableId, rowId: resourceId })
      if (resourceType === 'comment' && row.postId) {
        await tables
          .decrementRowColumn({
            databaseId: ids.databaseId,
            tableId: ids.posts,
            rowId: String(row.postId),
            column: 'countComments',
            value: 1,
            min: 0,
          })
          .catch((error: unknown) => console.error('Failed to decrement countComments', error))
      }
    }
  }

  await tables.updateRows({
    databaseId: ids.databaseId,
    tableId: ids.reports,
    data: { status: action === 'remove' ? 'removed' : 'dismissed', resolvedBy: moderator.id },
    queries: [
      Query.equal('resourceType', resourceType),
      Query.equal('resourceId', resourceId),
      Query.equal('status', 'open'),
    ],
  })
  return { ok: true, data: undefined }
}
