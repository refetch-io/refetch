import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { Hash, PenLine } from 'lucide-react'
import { z } from 'zod'
import { FEED_MAX_PAGES } from '@/lib/constants'
import { channelFeedQuery } from '@/lib/queries'
import { SITE_URL, seo } from '@/lib/seo'
import type { Channel, ChannelAbout, ChannelSort } from '@/lib/types'
import { compactNumber } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, SectionLabel } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/misc'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { FeedList, FeedSkeleton } from '@/components/feed/feed-view'
import { FeedLayout } from '@/components/feed/feed-layout'
import { Favicon } from '@/components/favicon'
import { SponsorCard } from '@/components/insights/insights-rail'
import { ChannelIcon, JoinButton, memberLabel, useChannels } from '@/components/channels/channel-parts'

const searchSchema = z.object({
  sort: z.enum(['hot', 'new']).optional().catch(undefined),
  page: z.number().int().min(2).max(FEED_MAX_PAGES).optional().catch(undefined),
})

export const Route = createFileRoute('/_app/c/$channelId')({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ sort: (search.sort ?? 'hot') as ChannelSort, page: search.page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    const data = await context.queryClient.ensureQueryData(
      channelFeedQuery(params.channelId, deps.sort, deps.page, context.user?.id ?? null),
    )
    return { name: data.channel.name, description: data.channel.description }
  },
  head: ({ loaderData, params }) => ({
    meta: seo({
      title: loaderData ? `${loaderData.name} - Refetch` : 'Channel - Refetch',
      description: loaderData?.description,
      url: `${SITE_URL}/c/${params.channelId}`,
    }),
  }),
  pendingComponent: () => (
    <FeedLayout header={<div className="mb-6 h-40 animate-pulse rounded-card bg-surface shadow-card" />}>
      <FeedSkeleton ranked />
    </FeedLayout>
  ),
  notFoundComponent: () => (
    <Card className="mx-auto max-w-xl">
      <EmptyState
        icon={<Hash />}
        title="Channel not found"
        description="This channel doesn’t exist. Browse the full list to find what you’re looking for."
        action={
          <Button asChild variant="primary" size="md">
            <Link to="/channels">Browse channels</Link>
          </Button>
        }
      />
    </Card>
  ),
  component: ChannelPage,
})

function ChannelPage() {
  const { channelId } = Route.useParams()
  const { sort, page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate({ from: Route.fullPath })
  const { data } = useSuspenseQuery(channelFeedQuery(channelId, sort, page, user?.id ?? null))
  // Prefer the directory copy so member counts update right after joining.
  const { byId } = useChannels()
  const channel = byId.get(channelId) ?? data.channel

  const header = (
    <Card className="mb-5 animate-rise-in overflow-hidden sm:mb-6">
      <div
        className="h-16 opacity-90 sm:h-20"
        style={{ background: `linear-gradient(120deg, ${channel.color}, ${channel.color}55)` }}
      />
      <div className="px-4 pb-4 sm:px-6 sm:pb-5">
        <div className="-mt-10 flex items-end justify-between gap-3">
          {/* Surface frame lifts the icon off the banner. */}
          <span className="relative rounded-[23px] bg-surface p-1 shadow-card">
            <ChannelIcon channel={channel} size={68} className="block" />
          </span>
          {/* The rail has its own Join button on wide screens. */}
          <JoinButton channel={channel} size="md" className="mb-1 xl:hidden" />
        </div>
        <h1 className="mt-4 text-title-1 text-label">{channel.name}</h1>
        <p className="mt-1 max-w-2xl text-subhead text-pretty text-label-secondary">{channel.description}</p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-footnote text-label-tertiary tabular">{memberLabel(channel.memberCount)}</p>
          <SegmentedControl<ChannelSort>
            aria-label="Sort stories"
            size="sm"
            className="w-44"
            value={sort}
            onValueChange={(value) =>
              navigate({
                search: { sort: value === 'hot' ? undefined : value, page: undefined },
                resetScroll: false,
              })
            }
            options={[
              { value: 'hot', label: 'Hot' },
              { value: 'new', label: 'New' },
            ]}
          />
        </div>
      </div>
    </Card>
  )

  return (
    <FeedLayout
      header={header}
      railLabel="About this channel"
      rail={<ChannelRail channel={channel} about={data.about} />}
    >
      <FeedList
        page={data.feed}
        ranked={sort === 'hot'}
        hideChannel
        empty={{
          title: 'No stories yet',
          description: `Fresh ${channel.name} stories arrive every couple of hours. You can also share one now.`,
          action: (
            <Button asChild variant="primary" size="md">
              <Link to="/submit" search={{ channel: channel.id }}>
                <PenLine />
                Submit to {channel.name}
              </Link>
            </Button>
          ),
        }}
      />
    </FeedLayout>
  )
}

function ChannelRail({ channel, about }: { channel: Channel; about: ChannelAbout }) {
  const { channels } = useChannels()
  const related = channels
    .filter((item) => item.category === channel.category && item.id !== channel.id)
    .slice(0, 5)

  return (
    <>
      <Card className="p-4">
        <dl className="grid grid-cols-2 gap-3">
          <Stat
            label={channel.memberCount === 1 ? 'Member' : 'Members'}
            value={compactNumber(channel.memberCount)}
          />
          <Stat label="Stories this week" value={compactNumber(about.weeklyStories)} />
        </dl>
        <div className="mt-4 flex gap-2">
          <JoinButton channel={channel} size="sm" className="flex-1" />
          <Button asChild variant="secondary" size="sm" className="flex-1">
            <Link to="/submit" search={{ channel: channel.id }}>
              <PenLine />
              Submit
            </Link>
          </Button>
        </div>
      </Card>

      {about.sources.length > 0 && (
        <Card className="py-3">
          <SectionLabel className="px-4 pb-1">Where stories come from</SectionLabel>
          <ul role="list">
            {about.sources.map((source) => (
              <li key={source.href}>
                <a
                  href={source.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-fill-secondary"
                >
                  <Favicon domain={source.domain} size={18} />
                  <span className="min-w-0 flex-1 truncate text-subhead text-label">{source.label}</span>
                  {source.official ? (
                    <Badge variant="brand">Official</Badge>
                  ) : (
                    <span className="text-caption-1 text-label-tertiary">Community</span>
                  )}
                </a>
              </li>
            ))}
          </ul>
          <p className="px-4 pt-2 text-caption-1 text-pretty text-label-tertiary">
            Scout checks these every two hours. Official sources come first.
          </p>
        </Card>
      )}

      {related.length > 0 && (
        <Card className="py-3">
          <SectionLabel className="px-4 pb-1">More in {channel.category}</SectionLabel>
          <ul role="list">
            {related.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-4 py-2">
                <Link
                  to="/c/$channelId"
                  params={{ channelId: item.id }}
                  className="group flex min-w-0 flex-1 items-center gap-3"
                >
                  <ChannelIcon channel={item} size={30} />
                  <span className="min-w-0">
                    <span className="block truncate text-subhead font-semibold text-label group-hover:text-brand-text">
                      {item.name}
                    </span>
                    <span className="block text-caption-1 text-label-tertiary tabular">
                      {memberLabel(item.memberCount)}
                    </span>
                  </span>
                </Link>
                <JoinButton channel={item} size="xs" />
              </li>
            ))}
          </ul>
          <div className="px-4 pt-1">
            <Link to="/channels" className="text-footnote font-semibold text-brand-text hover:underline">
              All channels
            </Link>
          </div>
        </Card>
      )}

      <SponsorCard />
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    // Label first for screen readers, value first on screen.
    <div className="flex flex-col-reverse rounded-xl bg-fill-secondary px-3 py-2.5">
      <dt className="text-caption-1 text-label-secondary">{label}</dt>
      <dd className="font-rounded text-title-3 font-semibold text-label tabular">{value}</dd>
    </div>
  )
}
