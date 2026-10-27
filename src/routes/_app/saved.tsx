import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { TrendingUp } from 'lucide-react'
import { savedStoriesQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { FeedList } from '@/components/feed/feed-view'
import { ColumnTitle } from '@/components/feed/feed-column'
import { FeedLayout, FeedPending, feedSearchSchema } from '@/components/feed/feed-layout'

const TITLE = 'Saved'
const DESCRIPTION = 'Stories you saved to read later, most recent first.'

export const Route = createFileRoute('/_app/saved')({
  validateSearch: feedSearchSchema,
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: '/signin', search: { redirect: location.href } })
    return { user: context.user }
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(savedStoriesQuery(deps.page, context.user.id)),
  head: () => ({
    meta: seo({ title: 'Saved - Refetch', url: `${SITE_URL}/saved`, noindex: true }),
  }),
  pendingComponent: () => <FeedPending title={TITLE} />,
  component: SavedPage,
})

function SavedPage() {
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const { data } = useSuspenseQuery(savedStoriesQuery(page, user.id))

  return (
    <FeedLayout column={<ColumnTitle title={TITLE} subtitle={DESCRIPTION} />}>
      <FeedList
        page={data ?? { posts: [], page, hasMore: false }}
        empty={{
          title: 'Nothing saved yet',
          description:
            'Tap the bookmark on any story to keep it here for later. Press S on a selected story.',
          action: (
            <Button asChild variant="primary" size="md">
              <Link to="/">
                <TrendingUp />
                Browse top stories
              </Link>
            </Button>
          ),
        }}
      />
    </FeedLayout>
  )
}
