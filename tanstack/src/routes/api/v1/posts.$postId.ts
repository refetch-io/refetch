import { createFileRoute } from '@tanstack/react-router'
import { deletePost, getPost } from '@/lib/api/posts.server'
import {
  apiError,
  handleRouteError,
  json,
  requireUser,
} from '@/lib/api/http.server'

export const Route = createFileRoute('/api/v1/posts/$postId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const post = await getPost(params.postId)
          if (!post) return apiError(404, 'Post not found')
          return json(post)
        } catch (error) {
          return handleRouteError(error)
        }
      },
      DELETE: async ({ request, params }) => {
        try {
          const user = await requireUser(request)
          await deletePost(params.postId, user.$id)
          return new Response(null, { status: 204 })
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
