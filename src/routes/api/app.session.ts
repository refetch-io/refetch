import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

/**
 * The app calls this right after signing in: it creates or renames the
 * person's profile, as `establishSession` does for the website.
 */
export const Route = createFileRoute('/api/app/session')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ handleAppRequest }, { syncProfile }] = await Promise.all([
          import('@/server/app-api.server'),
          import('@/server/profiles.server'),
        ])
        return handleAppRequest(
          request,
          z.object({}).passthrough(),
          async (_input, { user, registration }) => {
            await syncProfile(user, registration)
            return { ok: true, data: { user } }
          },
        )
      },
    },
  },
})
