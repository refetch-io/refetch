import { createFileRoute } from '@tanstack/react-router'
import {
  castVote,
  getVoteState,
  getVotesBatch,
} from '@/lib/api/votes.server'
import {
  apiError,
  handleRouteError,
  json,
  requireUser,
} from '@/lib/api/http.server'
import type { ResourceType, VoteDirection } from '@/lib/types'

export const Route = createFileRoute('/api/v1/votes')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const user = await requireUser(request)
          const url = new URL(request.url)
          const resourceId = url.searchParams.get('resourceId')
          const resourceType = url.searchParams.get(
            'resourceType',
          ) as ResourceType | null

          if (!resourceId || !resourceType) {
            return apiError(
              400,
              'resourceId and resourceType query params are required',
            )
          }
          if (!['post', 'comment'].includes(resourceType)) {
            return apiError(400, 'resourceType must be post or comment')
          }

          const state = await getVoteState(
            user.$id,
            resourceId,
            resourceType,
          )
          return json(state)
        } catch (error) {
          return handleRouteError(error)
        }
      },
      POST: async ({ request }) => {
        try {
          const user = await requireUser(request)
          const body = await request.json()

          if (body.action === 'batch') {
            const resources = Array.isArray(body.resources)
              ? body.resources
              : []
            const voteMap = await getVotesBatch(
              user.$id,
              resources.map((r: { id: string; type: ResourceType }) => ({
                id: String(r.id),
                type: r.type,
              })),
            )
            return json({ voteMap })
          }

          const resourceId = String(body.resourceId ?? '')
          const resourceType = body.resourceType as ResourceType
          const voteType = body.voteType as VoteDirection

          if (!resourceId || !resourceType || !voteType) {
            return apiError(
              400,
              'resourceId, resourceType, and voteType are required',
            )
          }
          if (!['post', 'comment'].includes(resourceType)) {
            return apiError(400, 'resourceType must be post or comment')
          }
          if (!['up', 'down'].includes(voteType)) {
            return apiError(400, 'voteType must be up or down')
          }

          const result = await castVote({
            userId: user.$id,
            resourceId,
            resourceType,
            voteType,
          })
          return json(result)
        } catch (error) {
          return handleRouteError(error)
        }
      },
    },
  },
})
