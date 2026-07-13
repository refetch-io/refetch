import { createFileRoute } from '@tanstack/react-router'
import { listPosts, createPost } from '@/lib/api/posts.server'
import {
  apiError,
  handleRouteError,
  json,
  requireUser,
} from '@/lib/api/http.server'
import type { SortType } from '@/lib/types'

export const Route = createFileRoute('/api/v1/posts')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const sort = (url.searchParams.get('sort') as SortType) || 'score'
          const limit = Number(url.searchParams.get('limit') || 25)
          const offset = Number(url.searchParams.get('offset') || 0)
          const userId = url.searchParams.get('userId') || undefined
          const since = url.searchParams.get('since') || undefined

          const result = await listPosts({
            sort,
            limit,
            offset,
            userId,
            since,
            feedWindow: sort !== 'mines',
          })
          return json(result)
        } catch (error) {
          return handleRouteError(error)
        }
      },
      POST: async ({ request }) => {
        try {
          const user = await requireUser(request)
          const body = await request.json()
          const title = String(body.title ?? '').trim()
          const type = body.type === 'show' ? 'show' : 'link'
          const url = body.url ? String(body.url).trim() : undefined
          const description = body.description
            ? String(body.description).trim()
            : undefined

          if (!title) {
            return apiError(400, 'Title is required')
          }
          if (type === 'link' && !url) {
            return apiError(400, 'URL is required for link posts')
          }

          const post = await createPost({
            title,
            url,
            description,
            type,
            userId: user.$id,
            userName: user.name || user.email || 'Anonymous',
          })
          return json(post, 201)
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
