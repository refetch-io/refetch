import { createFileRoute } from '@tanstack/react-router'

/** Add a comment or a reply; answers the new comment. */
export const Route = createFileRoute('/api/app/comments')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ handleAppRequest }, { commentInput }, { createComment }] = await Promise.all([
          import('@/server/app-api.server'),
          import('@/lib/app-api'),
          import('@/server/comments.server'),
        ])
        return handleAppRequest(request, commentInput, (input, { user }) => createComment(user, input))
      },
    },
  },
})
