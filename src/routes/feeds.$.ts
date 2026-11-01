import { createFileRoute } from '@tanstack/react-router'

/** RSS (`.xml`) and Atom (`.atom`) feeds: `/feeds/top.xml`, `/feeds/channels/rust.atom`, … */
export const Route = createFileRoute('/feeds/$')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { feedResponse } = await import('@/server/feeds.server')
        return feedResponse(params._splat ?? '')
      },
    },
  },
})
