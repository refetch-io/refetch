import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import { followingQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/misc'
import { FeedList } from '@/components/feed/feed-view'
import { FeedTabs } from '@/components/feed/feed-column'
import { FeedLayout, FeedPending, feedSearchSchema } from '@/components/feed/feed-layout'
import { ChannelIcon, JoinButton, useChannels } from '@/components/channels/channel-parts'

const TITLE = 'Following'
const DESCRIPTION = 'Three days of the best from your channels and people you follow.'

export const Route = createFileRoute('/_app/following')({
  validateSearch: feedSearchSchema,
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: '/signin', search: { redirect: location.href } })
    return { user: context.user }
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(followingQuery(deps.page, context.user.id)),
  head: () => ({
    meta: seo({
      title: 'Following - Refetch',
      description: DESCRIPTION,
      url: `${SITE_URL}/following`,
      noindex: true,
    }),
  }),
  pendingComponent: () => <FeedPending title={TITLE} />,
  component: FollowingPage,
})

function FollowingPage() {
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const { data } = useSuspenseQuery(followingQuery(page, user.id))
  const { channels } = useChannels()

  const header = <FeedTabs title={TITLE} />

  if (!data || data.joined === 0) {
    const suggestions = channels.slice(0, 6)
    return (
      <FeedLayout column={header}>
        <div>
          <EmptyState
            icon={<Compass />}
            title="Pick a few channels"
            description="Join the languages and topics you care about, and their best stories will gather here."
          />
          <ul
            role="list"
            className="grid gap-px overflow-hidden border-t border-separator bg-separator sm:grid-cols-2"
          >
            {suggestions.map((channel) => (
              <li key={channel.id} className="flex items-center gap-3 bg-surface px-4 py-3">
                <ChannelIcon channel={channel} size={36} />
                <Link
                  to="/c/$channelId"
                  params={{ channelId: channel.id }}
                  className="min-w-0 flex-1 truncate text-subhead font-semibold text-label hover:text-brand-text"
                >
                  {channel.name}
                </Link>
                <JoinButton channel={channel} size="xs" />
              </li>
            ))}
          </ul>
          <div className="border-t border-separator p-4 text-center">
            <Button asChild variant="plain" size="sm">
              <Link to="/channels">See all channels</Link>
            </Button>
          </div>
        </div>
      </FeedLayout>
    )
  }

  return (
    <FeedLayout column={header} feed={data}>
      <FeedList
        page={data}
        ranked
        empty={{
          title: 'Quiet in your channels',
          description: 'Nothing new in the last few days. Join a few more channels to widen the net.',
          action: (
            <Button asChild variant="primary" size="md">
              <Link to="/channels">Browse channels</Link>
            </Button>
          ),
        }}
      />
    </FeedLayout>
  )
}
