import { createFileRoute } from '@tanstack/react-router'
import { FeedPage } from '@/components/feed-page'
import { fetchFeed } from '@/lib/feed.functions'

export const Route = createFileRoute('/_app/')({
  loader: () => fetchFeed({ data: { sort: 'score', limit: 25, offset: 0 } }),
  component: TopFeed,
  head: () => ({
    meta: [{ title: 'Refetch — Top' }],
  }),
})

function TopFeed() {
  const data = Route.useLoaderData()
  return (
    <FeedPage
      initialPosts={data.data}
      initialTotal={data.total}
      sort="score"
      title="Top"
      description="Highest-ranked stories from the last 24 hours."
    />
  )
}
