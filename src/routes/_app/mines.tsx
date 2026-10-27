import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { PenLine } from 'lucide-react'
import { myPostsQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { FeedList } from '@/components/feed/feed-view'
import { ColumnTitle } from '@/components/feed/feed-column'
import { FeedLayout, FeedPending, feedSearchSchema } from '@/components/feed/feed-layout'

const TITLE = 'Your Posts'
const DESCRIPTION = 'Everything you’ve shared with the community, newest first.'

export const Route = createFileRoute('/_app/mines')({
  validateSearch: feedSearchSchema,
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: '/signin', search: { redirect: location.href } })
    return { user: context.user }
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(myPostsQuery(deps.page, context.user.id)),
  head: () => ({
    meta: seo({
      title: 'My Posts - Refetch',
      description:
        'View your submitted posts on Refetch - track your contributions to the tech community and manage your submissions.',
      url: `${SITE_URL}/mines`,
      noindex: true,
    }),
  }),
  pendingComponent: () => <FeedPending title={TITLE} />,
  component: MinesPage,
})

function MinesPage() {
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const { data } = useSuspenseQuery(myPostsQuery(page, user.id))

  return (
    <FeedLayout column={<ColumnTitle title={TITLE} subtitle={DESCRIPTION} />} feed={data}>
      <FeedList
        page={data ?? { posts: [], page, hasMore: false }}
        empty={{
          title: 'You haven’t posted yet',
          description: 'Found something worth reading? Share it and start the conversation.',
          action: (
            <Button asChild variant="primary" size="md">
              <Link to="/submit">
                <PenLine />
                Submit your first story
              </Link>
            </Button>
          ),
        }}
      />
    </FeedLayout>
  )
}
