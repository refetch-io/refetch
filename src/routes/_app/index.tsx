import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { PenLine } from 'lucide-react'
import { feedQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { FeedList } from '@/components/feed/feed-view'
import { FeedTabs } from '@/components/feed/feed-column'
import { FeedLayout, FeedPending, feedSearchSchema } from '@/components/feed/feed-layout'

const TITLE = 'Top Stories'

export const Route = createFileRoute('/_app/')({
  validateSearch: feedSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(feedQuery('top', deps.page, context.user?.id ?? null)),
  head: () => ({
    meta: seo({
      title: 'Refetch: Latest Tech News & Discussions',
      description:
        'Discover the latest technology news, startup updates, and programming discussions on Refetch. An open-source community-driven platform for tech enthusiasts.',
      url: `${SITE_URL}`,
    }),
  }),
  pendingComponent: () => <FeedPending title={TITLE} ranked />,
  component: TopPage,
})

function TopPage() {
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const { data } = useSuspenseQuery(feedQuery('top', page, user?.id ?? null))

  return (
    <FeedLayout column={<FeedTabs title={TITLE} />} feed={data}>
      <FeedList
        page={data}
        ranked
        empty={{
          title: 'Nothing here yet',
          description: 'New stories land throughout the day. Check back soon, or share something great.',
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
