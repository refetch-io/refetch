import { createFileRoute } from '@tanstack/react-router'
import { FeedPage } from '@/components/feed-page'
import { fetchFeed } from '@/lib/feed.functions'

export const Route = createFileRoute('/_app/show')({
  loader: () => fetchFeed({ data: { sort: 'show', limit: 25, offset: 0 } }),
  component: ShowFeed,
  head: () => ({
    meta: [{ title: 'Refetch - Show' }],
  }),
})

function ShowFeed() {
  const data = Route.useLoaderData()
  return (
    <FeedPage
      initialPosts={data.data}
      initialTotal={data.total}
      sort="show"
      title="Show"
      description="Show RF - projects and launches from the community."
    />
  )
}
