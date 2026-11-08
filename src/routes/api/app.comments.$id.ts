import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

/** Delete one of your own comments. */
export const Route = createFileRoute('/api/app/comments/$id')({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const [{ handleAppRequest }, { isValidId }, { removeComment }] = await Promise.all([
          import('@/server/app-api.server'),
          import('@/lib/url'),
          import('@/server/comments.server'),
        ])
        return handleAppRequest(request, z.object({}), async (_input, { user }) => {
          if (!isValidId(params.id)) return { ok: false, error: 'This comment no longer exists.' }
          return removeComment(user, params.id)
        })
      },
    },
  },
})
