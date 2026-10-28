import { createFileRoute } from '@tanstack/react-router'

/** Child sitemaps: pages, then paginated topics, stories by month and people by year. */
export const Route = createFileRoute('/sitemaps/$file')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { renderSitemapFile, sitemapResponse } = await import('@/server/sitemap.server')
        return sitemapResponse(() => renderSitemapFile(params.file))
      },
    },
  },
})
