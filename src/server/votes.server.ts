import { ID } from 'node-appwrite'
import type { ActionResult, ResourceType, SessionUser, VoteDirection, VoteState } from '@/lib/types'
import { isNotFound } from './appwrite.server'
import { crossedMilestone } from '@/lib/notifications'
import { Query, db, voteFromCount, type Row } from './db.server'
import { notify } from './notifications.server'

type Delta = Partial<Record<'count' | 'countUp' | 'countDown', number>>

/**
 * Toggle a vote, mirroring the original `/api/vote` semantics:
 * - no vote yet        → create it
 * - same direction     → remove it
 * - other direction    → flip it
 * Counters (`count`, `countUp`, `countDown`) are updated atomically.
 */
export async function castVote(
  user: SessionUser,
  resourceType: ResourceType,
  resourceId: string,
  direction: VoteDirection,
): Promise<ActionResult<VoteState>> {
  const { tables, ids } = db()
  const tableId = resourceType === 'post' ? ids.posts : ids.comments

  const [existing, resource] = await Promise.all([
    tables
      .listRows({
        databaseId: ids.databaseId,
        tableId: ids.votes,
        queries: [
          Query.equal('userId', user.id),
          Query.equal('resourceId', resourceId),
          Query.equal('resourceType', resourceType),
          Query.limit(1),
        ],
        total: false,
      })
      .then((result) => (result.rows[0] as Row | undefined) ?? null),
    tables
      .getRow({
        databaseId: ids.databaseId,
        tableId,
        rowId: resourceId,
        queries: [
          Query.select(resourceType === 'post' ? ['$id', 'count', 'userId', 'title'] : ['$id', 'count']),
        ],
      })
      .catch((error: unknown) => {
        if (isNotFound(error)) return null
        throw error
      }),
  ])

  if (!resource) {
    return {
      ok: false,
      error: resourceType === 'post' ? 'This story no longer exists.' : 'This comment no longer exists.',
    }
  }

  let delta: Delta
  let vote: VoteState['vote']

  if (existing) {
    const previous = voteFromCount(existing.count)
    if (previous === direction) {
      await tables.deleteRow({ databaseId: ids.databaseId, tableId: ids.votes, rowId: existing.$id })
      delta = previous === 'up' ? { count: -1, countUp: -1 } : { count: 1, countDown: -1 }
      vote = null
    } else {
      await tables.updateRow({
        databaseId: ids.databaseId,
        tableId: ids.votes,
        rowId: existing.$id,
        data: { count: direction === 'up' ? 1 : -1 },
      })
      delta =
        direction === 'down'
          ? { count: -2, countUp: -1, countDown: 1 }
          : { count: 2, countUp: 1, countDown: -1 }
      vote = direction
    }
  } else {
    await tables.createRow({
      databaseId: ids.databaseId,
      tableId: ids.votes,
      rowId: ID.unique(),
      data: {
        userId: user.id,
        resourceId,
        resourceType,
        count: direction === 'up' ? 1 : -1,
      },
    })
    delta = direction === 'up' ? { count: 1, countUp: 1 } : { count: -1, countDown: 1 }
    vote = direction
  }

  // Apply the counter changes; `count` goes last so its result is the final score.
  const order: Array<keyof Delta> = ['countUp', 'countDown', 'count']
  let finalCount = Number((resource as Row).count ?? 0) + (delta.count ?? 0)
  for (const column of order) {
    const value = delta[column]
    if (!value) continue
    const params = {
      databaseId: ids.databaseId,
      tableId,
      rowId: resourceId,
      column,
      value: Math.abs(value),
    }
    const row = (
      value > 0 ? await tables.incrementRowColumn(params) : await tables.decrementRowColumn(params)
    ) as Row
    if (column === 'count' && typeof row.count === 'number') finalCount = row.count
  }

  const startCount = Number((resource as Row).count ?? 0)
  const milestone = resourceType === 'post' ? crossedMilestone(startCount, finalCount) : null
  if (milestone) {
    await notify({
      recipientId: String((resource as Row).userId ?? ''),
      type: 'milestone',
      actor: null,
      postId: resourceId,
      postTitle: String((resource as Row).title ?? ''),
      preview: String(milestone),
      dedupeKey: `milestone:${resourceId}:${milestone}`,
    })
  }

  return { ok: true, data: { vote, count: finalCount } }
}
