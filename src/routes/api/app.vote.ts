import { createFileRoute } from '@tanstack/react-router'

/** Cast, flip or remove a vote; answers the new vote and score. */
export const Route = createFileRoute('/api/app/vote')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ handleAppRequest }, { voteInput }, { castVote }] = await Promise.all([
          import('@/server/app-api.server'),
          import('@/lib/app-api'),
          import('@/server/votes.server'),
        ])
        return handleAppRequest(request, voteInput, (input, { user }) =>
          castVote(user, input.resourceType, input.resourceId, input.direction),
        )
      },
    },
  },
})
