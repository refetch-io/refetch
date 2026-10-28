import { createFileRoute } from '@tanstack/react-router'

/** The sitemap index; each file it lists is served by `/sitemaps/$file`. */
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const { renderSitemapIndex, sitemapResponse } = await import('@/server/sitemap.server')
        return sitemapResponse(renderSitemapIndex)
      },
    },
  },
})
