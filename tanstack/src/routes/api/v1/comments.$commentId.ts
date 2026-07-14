import { createFileRoute } from '@tanstack/react-router'
import { deleteComment } from '@/lib/api/comments.server'
import {
  apiError,
  handleRouteError,
  requireUser,
} from '@/lib/api/http.server'

export const Route = createFileRoute('/api/v1/comments/$commentId')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        try {
          const user = await requireUser(request)
          const result = await deleteComment(params.commentId, user.$id)
          return Response.json(result)
        } catch (error) {
          if (error && typeof error === 'object' && 'status' in error) {
            return apiError(
              Number((error as { status: number }).status),
              error instanceof Error ? error.message : 'Request failed',
            )
          }
          return handleRouteError(error)
        }
      },
    },
  },
})
