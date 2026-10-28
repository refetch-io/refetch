import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { PenLine } from 'lucide-react'
import { configQuery, feedQuery } from '@/lib/queries'
import { SITE_URL, feedHead } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { FeedList } from '@/components/feed/feed-view'
import { FeedTabs } from '@/components/feed/feed-column'
import { FeedLayout, FeedPending, feedSearchSchema } from '@/components/feed/feed-layout'

const TITLE = 'Show Refetch'

export const Route = createFileRoute('/_app/show')({
  validateSearch: feedSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, deps }) => {
    const [feed, config] = await Promise.all([
      context.queryClient.ensureQueryData(feedQuery('show', deps.page, context.user?.id ?? null)),
      context.queryClient.ensureQueryData(configQuery()),
    ])
    return {
      siteUrl: config.siteUrl,
      page: deps.page,
      stories: feed.posts.map((post) => ({ id: post.id, title: post.title })),
    }
  },
  head: ({ loaderData }) =>
    feedHead({
      siteUrl: loaderData?.siteUrl ?? SITE_URL,
      path: '/show',
      page: loaderData?.page ?? 1,
      title: 'Show - Refetch',
      description: 'Show and tell posts from the Refetch community.',
      name: 'Show Refetch',
      stories: loaderData?.stories ?? [],
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
