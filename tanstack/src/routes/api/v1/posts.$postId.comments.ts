import { createFileRoute } from '@tanstack/react-router'
import { createComment, listComments } from '@/lib/api/comments.server'
import {
  apiError,
  handleRouteError,
  json,
  requireUser,
} from '@/lib/api/http.server'

export const Route = createFileRoute('/api/v1/posts/$postId/comments')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const result = await listComments(params.postId)
          return json({ data: result.data, total: result.total })
        } catch (error) {
          return handleRouteError(error)
        }
      },
      POST: async ({ request, params }) => {
        try {
          const user = await requireUser(request)
          const body = await request.json()
          const text = String(body.text ?? '').trim()
          if (!text) return apiError(400, 'Comment text is required')

          const comment = await createComment({
            postId: params.postId,
            userId: user.$id,
            userName: user.name || user.email || 'Anonymous',
            text,
            replyId: body.replyId ? String(body.replyId) : undefined,
          })
          return json(comment, 201)
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
