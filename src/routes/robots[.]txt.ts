import { createFileRoute } from '@tanstack/react-router'
import { buildRobots } from '@/lib/sitemap'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => {
        const { getSiteUrl } = await import('@/server/env.server')
        return new Response(buildRobots(getSiteUrl()), {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
        })
      },
    },
  },
})
