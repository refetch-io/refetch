import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { PenLine } from 'lucide-react'
import { configQuery, feedQuery } from '@/lib/queries'
import { SITE_URL, feedHead } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { FeedList } from '@/components/feed/feed-view'
import { FeedTabs } from '@/components/feed/feed-column'
import { FeedLayout, FeedPending, feedSearchSchema } from '@/components/feed/feed-layout'

const TITLE = 'Top Stories'

export const Route = createFileRoute('/_app/')({
  validateSearch: feedSearchSchema,
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, deps }) => {
    const [feed, config] = await Promise.all([
      context.queryClient.ensureQueryData(feedQuery('top', deps.page, context.user?.id ?? null)),
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
      path: '/',
      page: loaderData?.page ?? 1,
      title: 'Refetch: Latest Tech News & Discussions',
      description:
        'Discover the latest technology news, startup updates, and programming discussions on Refetch. An open-source community-driven platform for tech enthusiasts.',
      name: 'Top tech stories on Refetch',
      stories: loaderData?.stories ?? [],
      home: true,
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
