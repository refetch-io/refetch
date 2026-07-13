import { createFileRoute } from '@tanstack/react-router'
import { searchPosts } from '@/lib/api/posts.server'
import { apiError, handleRouteError, json } from '@/lib/api/http.server'

export const Route = createFileRoute('/api/v1/posts/search')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const q = (url.searchParams.get('q') || '').trim()
          const limit = Number(url.searchParams.get('limit') || 20)

          if (q.length > 0 && q.length < 3) {
            return apiError(400, 'Search query must be at least 3 characters')
          }

          const result = await searchPosts({ q, limit })
          return json(result)
        } catch (error) {
          return handleRouteError(error)
        }
      },
    },
  },
})
