import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const { renderSitemap } = await import('@/server/sitemap.server')
        return new Response(await renderSitemap(), {
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
          },
        })
      },
    },
  },
})
