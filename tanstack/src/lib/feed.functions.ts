import { createServerFn } from '@tanstack/react-start'
import { listPosts, getPost } from '@/lib/api/posts.server'
import { listComments } from '@/lib/api/comments.server'
import type { SortType } from '@/lib/types'

export const fetchFeed = createServerFn({ method: 'GET' })
  .validator((input: { sort: SortType; limit?: number; offset?: number }) => input)
  .handler(async ({ data }) => {
    try {
      return await listPosts({
        sort: data.sort,
        limit: data.limit ?? 25,
        offset: data.offset ?? 0,
      })
    } catch (error) {
      console.error(error)
      return {
        data: [],
        total: 0,
        limit: data.limit ?? 25,
        offset: data.offset ?? 0,
      }
    }
  })

export const fetchThread = createServerFn({ method: 'GET' })
  .validator((input: { threadId: string }) => input)
  .handler(async ({ data }) => {
    const post = await getPost(data.threadId)
    if (!post) {
      throw new Error('Post not found')
    }
    const comments = await listComments(data.threadId)
    return { post, comments: comments.data }
  })
