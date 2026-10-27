import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { PenLine } from 'lucide-react'
import { feedQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { FeedList } from '@/components/feed/feed-view'
import { FeedTabs } from '@/components/feed/feed-column'
import { FeedLayout, FeedPending, feedSearchSchema } from '@/components/feed/feed-layout'

const TITLE = 'Newest'

export const Route = createFileRoute('/_app/new')({
  validateSearch: feedSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(feedQuery('new', deps.page, context.user?.id ?? null)),
  head: () => ({
    meta: seo({
      title: 'New - Refetch',
      description: 'Latest technology news and discussions sorted by newest first.',
      url: `${SITE_URL}/new`,
    }),
  }),
  pendingComponent: () => <FeedPending title={TITLE} />,
  component: NewPage,
})

function NewPage() {
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const { data } = useSuspenseQuery(feedQuery('new', page, user?.id ?? null))

  return (
    <FeedLayout column={<FeedTabs title={TITLE} />} feed={data}>
      <FeedList
        page={data}
        empty={{
          title: 'No new stories',
          description: 'Nothing has been posted in the last 24 hours.',
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
