import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { PenLine } from 'lucide-react'
import { feedQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { FeedList } from '@/components/feed/feed-view'
import { FeedTabs } from '@/components/feed/feed-column'
import { FeedLayout, FeedPending, feedSearchSchema } from '@/components/feed/feed-layout'

const TITLE = 'Show Refetch'

export const Route = createFileRoute('/_app/show')({
  validateSearch: feedSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(feedQuery('show', deps.page, context.user?.id ?? null)),
  head: () => ({
    meta: seo({
      title: 'Show - Refetch',
      description: 'Show and tell posts from the Refetch community.',
      url: `${SITE_URL}/show`,
    }),
  }),
  pendingComponent: () => <FeedPending title={TITLE} ranked />,
  component: ShowPage,
})

function ShowPage() {
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const { data } = useSuspenseQuery(feedQuery('show', page, user?.id ?? null))

  return (
    <FeedLayout column={<FeedTabs title={TITLE} />} feed={data}>
      <FeedList
        page={data}
        ranked
        empty={{
          title: 'No launches today',
          description: 'Product launches and Show RF posts from the last 24 hours appear here.',
          action: (
            <Button asChild variant="primary" size="md">
              <Link to="/submit">
                <PenLine />
                Submit a story
              </Link>
            </Button>
          ),
        }}
      />
    </FeedLayout>
  )
}
