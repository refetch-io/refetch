import { createFileRoute } from '@tanstack/react-router'
import { completeAppwriteOAuth } from '@/server/oauth.server'

/**
 * Appwrite redirects here after "Continue with Appwrite" with a one-time
 * `userId` + `secret`. We exchange them for a session cookie and move on.
 */
export const Route = createFileRoute('/auth/callback')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const params = new URL(request.url).searchParams
        const location = await completeAppwriteOAuth({
          userId: params.get('userId'),
          secret: params.get('secret'),
          state: params.get('state'),
        })
        return new Response(null, {
          status: 302,
          headers: { Location: location, 'Cache-Control': 'no-store' },
        })
      },
    },
  },
})
