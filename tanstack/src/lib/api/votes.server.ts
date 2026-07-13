import { getTablesDB, ID, Query, tables } from '../appwrite.server'
import type { ResourceType, VoteDirection, VoteState } from '../types'

function collectionFor(resourceType: ResourceType) {
  return resourceType === 'post' ? tables.posts() : tables.comments()
}

export async function getVoteState(
  userId: string,
  resourceId: string,
  resourceType: ResourceType,
): Promise<VoteState> {
  const db = getTablesDB()
  const resource = await db.getRow({
    databaseId: tables.databaseId(),
    tableId: collectionFor(resourceType),
    rowId: resourceId,
  })

  const existing = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.votes(),
    queries: [
      Query.equal('userId', userId),
      Query.equal('resourceId', resourceId),
      Query.equal('resourceType', resourceType),
      Query.limit(1),
    ],
  })

  let currentVote: VoteDirection | null = null
  if (existing.rows[0]) {
    currentVote = existing.rows[0].count === 1 ? 'up' : 'down'
  }

  return {
    currentVote,
    count: Number(resource.count ?? 0),
    countUp: Number(resource.countUp ?? 0),
    countDown: Number(resource.countDown ?? 0),
  }
}

export async function getVotesBatch(
  userId: string,
  resources: Array<{ id: string; type: ResourceType }>,
) {
  if (resources.length === 0) return {} as Record<string, VoteDirection | null>

  const db = getTablesDB()
  const resourceIds = resources.map((r) => r.id)
  const existing = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.votes(),
    queries: [
      Query.equal('userId', userId),
      Query.equal('resourceId', resourceIds),
      Query.limit(100),
    ],
  })

  const map: Record<string, VoteDirection | null> = {}
  for (const resource of resources) {
    map[`${resource.type}:${resource.id}`] = null
  }
  for (const vote of existing.rows) {
    const key = `${vote.resourceType}:${vote.resourceId}`
    map[key] = vote.count === 1 ? 'up' : 'down'
  }
  return map
}

export async function castVote(input: {
  userId: string
  resourceId: string
  resourceType: ResourceType
  voteType: VoteDirection
}) {
  const { userId, resourceId, resourceType, voteType } = input
  const db = getTablesDB()
  const tableId = collectionFor(resourceType)

  const existing = await db.listRows({
    databaseId: tables.databaseId(),
    tableId: tables.votes(),
    queries: [
      Query.equal('userId', userId),
      Query.equal('resourceId', resourceId),
      Query.equal('resourceType', resourceType),
      Query.limit(1),
    ],
  })

  let operation: 'created' | 'changed' | 'removed' = 'created'
  let finalVoteType: VoteDirection | null = voteType

  if (existing.rows.length > 0) {
    const existingVote = existing.rows[0]
    const existingVoteType: VoteDirection =
      existingVote.count === 1 ? 'up' : 'down'

    if (existingVoteType === voteType) {
      operation = 'removed'
      finalVoteType = null
      await db.deleteRow({
        databaseId: tables.databaseId(),
        tableId: tables.votes(),
        rowId: existingVote.$id,
      })
      if (voteType === 'up') {
        await db.decrementRowColumn({
          databaseId: tables.databaseId(),
          tableId,
          rowId: resourceId,
          column: 'count',
          value: 1,
        })
        await db.decrementRowColumn({
          databaseId: tables.databaseId(),
          tableId,
          rowId: resourceId,
          column: 'countUp',
          value: 1,
        })
      } else {
        await db.incrementRowColumn({
          databaseId: tables.databaseId(),
          tableId,
          rowId: resourceId,
          column: 'count',
          value: 1,
        })
        await db.decrementRowColumn({
          databaseId: tables.databaseId(),
          tableId,
          rowId: resourceId,
          column: 'countDown',
          value: 1,
        })
      }
    } else {
      operation = 'changed'
      await db.updateRow({
        databaseId: tables.databaseId(),
        tableId: tables.votes(),
        rowId: existingVote.$id,
        data: { count: voteType === 'up' ? 1 : -1 },
      })
      if (existingVoteType === 'up' && voteType === 'down') {
        await db.decrementRowColumn({
          databaseId: tables.databaseId(),
          tableId,
          rowId: resourceId,
          column: 'count',
          value: 2,
        })
        await db.decrementRowColumn({
          databaseId: tables.databaseId(),
          tableId,
          rowId: resourceId,
          column: 'countUp',
          value: 1,
        })
        await db.incrementRowColumn({
          databaseId: tables.databaseId(),
          tableId,
          rowId: resourceId,
          column: 'countDown',
          value: 1,
        })
      } else {
        await db.incrementRowColumn({
          databaseId: tables.databaseId(),
          tableId,
          rowId: resourceId,
          column: 'count',
          value: 2,
        })
        await db.decrementRowColumn({
          databaseId: tables.databaseId(),
          tableId,
          rowId: resourceId,
          column: 'countDown',
          value: 1,
        })
        await db.incrementRowColumn({
          databaseId: tables.databaseId(),
          tableId,
          rowId: resourceId,
          column: 'countUp',
          value: 1,
        })
      }
    }
  } else {
    await db.createRow({
      databaseId: tables.databaseId(),
      tableId: tables.votes(),
      rowId: ID.unique(),
      data: {
        userId,
        resourceId,
        resourceType,
        count: voteType === 'up' ? 1 : -1,
      },
    })

    if (voteType === 'up') {
      await db.incrementRowColumn({
        databaseId: tables.databaseId(),
        tableId,
        rowId: resourceId,
        column: 'count',
        value: 1,
      })
      await db.incrementRowColumn({
        databaseId: tables.databaseId(),
        tableId,
        rowId: resourceId,
        column: 'countUp',
        value: 1,
      })
    } else {
      await db.decrementRowColumn({
        databaseId: tables.databaseId(),
        tableId,
        rowId: resourceId,
        column: 'count',
        value: 1,
      })
      await db.incrementRowColumn({
        databaseId: tables.databaseId(),
        tableId,
        rowId: resourceId,
        column: 'countDown',
        value: 1,
      })
    }
  }

  const state = await getVoteState(userId, resourceId, resourceType)

  return {
    operation,
    voteType: finalVoteType,
    ...state,
  }
}

