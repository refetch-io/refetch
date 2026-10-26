import { createFileRoute } from '@tanstack/react-router'
import { isValidId } from '@/lib/url'

/** Open Graph image for a thread — same URL as before, so shared links keep working. */
export const Route = createFileRoute('/api/og/thread/$id')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        // Loaded on demand: the image renderer is heavy and only needed here.
        const [{ renderThreadImage }, { getPostById }] = await Promise.all([
          import('@/server/og.server'),
          import('@/server/posts.server'),
        ])
        try {
          const post = isValidId(params.id) ? await getPostById(params.id).catch(() => null) : null
          return await renderThreadImage(post)
        } catch (error) {
          console.error('[og] failed to render thread image', error)
          return Response.redirect(new URL('/og.png', request.url), 302)
        }
      },
    },
  },
})
