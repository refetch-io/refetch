import { createFileRoute } from '@tanstack/react-router'

/** Submit a story; answers its id (409 with `existingId` when it was already shared). */
export const Route = createFileRoute('/api/app/submit')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ handleAppRequest }, { submitInput }, { createPost }] = await Promise.all([
          import('@/server/app-api.server'),
          import('@/lib/app-api'),
          import('@/server/posts.server'),
        ])
        return handleAppRequest(request, submitInput, (input, { user }) => createPost(user, input))
      },
    },
  },
})
