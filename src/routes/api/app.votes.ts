import { createFileRoute } from '@tanstack/react-router'

/** The signed-in person's votes on the given posts and comments (votes are private). */
export const Route = createFileRoute('/api/app/votes')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const [{ handleAppRequest }, { voteLookupInput }, { getUserVotes }] = await Promise.all([
          import('@/server/app-api.server'),
          import('@/lib/app-api'),
          import('@/server/db.server'),
        ])
        return handleAppRequest(request, voteLookupInput, async (input, { user }) => {
          const [posts, comments] = await Promise.all([
            getUserVotes(user.id, 'post', input.posts),
            getUserVotes(user.id, 'comment', input.comments),
          ])
          return {
            ok: true,
            data: { posts: Object.fromEntries(posts), comments: Object.fromEntries(comments) },
          }
        })
      },
    },
  },
})
