import { createFileRoute } from '@tanstack/react-router'
import { FeedPage } from '@/components/feed-page'
import { fetchFeed } from '@/lib/feed.functions'

export const Route = createFileRoute('/_app/new')({
  loader: () => fetchFeed({ data: { sort: 'new', limit: 25, offset: 0 } }),
  component: NewFeed,
  head: () => ({
    meta: [{ title: 'Refetch - New' }],
  }),
})

function NewFeed() {
  const data = Route.useLoaderData()
  return (
    <FeedPage
      initialPosts={data.data}
      initialTotal={data.total}
      sort="new"
      title="New"
      description="Newest submissions first."
    />
  )
}
