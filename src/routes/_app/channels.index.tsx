import * as React from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { Hash, Search, X } from 'lucide-react'
import { channelDirectoryQuery, configQuery } from '@/lib/queries'
import { SITE_URL, breadcrumbs, collectionPage, seo } from '@/lib/seo'
import type { Channel } from '@/lib/types'
import { cn } from '@/lib/utils'
import { FeedHeader } from '@/components/feed/feed-view'
import { SiteFooter } from '@/components/layout/footer'
import { VerifiedBadge } from '@/components/verified-badge'
import {
  ChannelIcon,
  JoinButton,
  channelMatches,
  groupByCategory,
  memberLabel,
  useChannels,
} from '@/components/channels/channel-parts'
import { Button } from '@/components/ui/button'
import { Card, SectionLabel } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { EmptyState, Skeleton } from '@/components/ui/misc'

const JOINED = 'Joined'

export const Route = createFileRoute('/_app/channels/')({
  loader: async ({ context }) => {
    const [directory, config] = await Promise.all([
      context.queryClient.ensureQueryData(channelDirectoryQuery(context.user?.id ?? null)),
      context.queryClient.ensureQueryData(configQuery()),
    ])
    return {
      siteUrl: config.siteUrl,
      channels: directory.channels.map((channel) => ({ id: channel.id, name: channel.name })),
    }
  },
  head: ({ loaderData }) => {
    const siteUrl = loaderData?.siteUrl ?? SITE_URL
    const url = `${siteUrl}/channels`
    const description =
      'Tech news channels for the languages, platforms and topics you care about: AI, web, mobile, Rust, Python, security and more. Join them to fill your Following feed.'
    return {
      meta: seo({ title: 'Tech news channels by language, platform and topic | Refetch', description, url }),
      links: [{ rel: 'canonical', href: url }],
      scripts: [
        collectionPage({
          siteUrl,
          url,
          name: 'Channels on Refetch',
          description,
          items: (loaderData?.channels ?? []).map((channel) => ({
            name: channel.name,
            url: `${siteUrl}/channels/${channel.id}`,
          })),
        }),
        breadcrumbs([
          { name: 'Refetch', url: `${siteUrl}/` },
          { name: 'Channels', url },
        ]),
      ],
    }
  },
  component: ChannelsPage,
})

function ChannelsPage() {
  const { channels, joined, ready } = useChannels()
  const [query, setQuery] = React.useState('')
  const [filter, setFilter] = React.useState<string | null>(null)

  const groups = groupByCategory(channels)
  const filters = [...(joined.size > 0 ? [JOINED] : []), ...groups.map((group) => group.category)]
  const activeFilter = filter && filters.includes(filter) ? filter : null
  const results = channels.filter(
    (channel) =>
      channelMatches(channel, query) &&
      (!activeFilter ||
        (activeFilter === JOINED ? joined.has(channel.id) : channel.category === activeFilter)),
  )
  const flat = query.trim() !== '' || activeFilter !== null

  return (
    <div className="mx-auto max-w-5xl">
      <FeedHeader
        title="Channels"
        description="Join the languages, platforms and topics you care about. Their stories fill your Following feed."
      />

      {ready && channels.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Hash />}
            title="Channels are on their way"
            description="The channel list hasn’t been set up yet. Check back shortly."
          />
        </Card>
      ) : (
        <>
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative sm:w-72">
              <Search
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-label-tertiary"
                strokeWidth={2.2}
              />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') setQuery('')
                }}
                placeholder="Search channels"
                aria-label="Search channels"
                className="h-10 pr-9 pl-10 [&::-webkit-search-cancel-button]:hidden"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-2.5 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-label-tertiary/40 text-surface hover:bg-label-tertiary/60"
                >
                  <X className="size-3" strokeWidth={3} />
                </button>
              )}
            </div>
            <div
              role="group"
              aria-label="Filter by category"
              className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0"
            >
              <FilterPill active={activeFilter === null} onClick={() => setFilter(null)}>
                All
              </FilterPill>
              {filters.map((name) => (
                <FilterPill
                  key={name}
                  active={activeFilter === name}
                  onClick={() => setFilter(activeFilter === name ? null : name)}
                >
                  {name}
                  {name === JOINED && <span className="tabular opacity-70">{joined.size}</span>}
                </FilterPill>
              ))}
            </div>
          </div>

          {!ready ? (
            <ChannelGrid>
              {Array.from({ length: 9 }, (_, i) => (
                <li key={i} className="rounded-card bg-surface p-4 shadow-card">
                  <div className="flex items-center gap-3">
                    <Skeleton className="size-11 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24 rounded-full" />
                      <Skeleton className="h-3 w-16 rounded-full" />
                    </div>
                  </div>
                  <Skeleton className="mt-4 h-3 w-full rounded-full" />
                </li>
              ))}
            </ChannelGrid>
          ) : results.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Search />}
                title="No matching channels"
                description={
                  query.trim()
                    ? `Nothing matches “${query.trim()}”. Try a language, framework or topic.`
                    : 'Nothing here yet.'
                }
                action={
                  <Button
                    variant="secondary"
                    size="md"
                    onClick={() => {
                      setQuery('')
                      setFilter(null)
                    }}
                  >
                    Show all channels
                  </Button>
                }
              />
            </Card>
          ) : flat ? (
            <>
              <p className="mb-3 px-1 text-footnote text-label-secondary tabular">
                {results.length} {results.length === 1 ? 'channel' : 'channels'}
              </p>
              <ChannelGrid>
                {results.map((channel, index) => (
                  <ChannelCard key={channel.id} channel={channel} index={index} />
                ))}
              </ChannelGrid>
            </>
          ) : (
            <div className="space-y-8">
              {groups.map((group) => (
                <section key={group.category} aria-labelledby={`category-${group.category}`}>
                  <SectionLabel id={`category-${group.category}`} className="mb-3">
                    {group.category}
                  </SectionLabel>
                  <ChannelGrid>
                    {group.channels.map((channel, index) => (
                      <ChannelCard key={channel.id} channel={channel} index={index} />
                    ))}
                  </ChannelGrid>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      <SiteFooter variant="page" className="mt-16 lg:hidden" />
    </div>
  )
}

function FilterPill({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 shrink-0 pressable items-center gap-1.5 rounded-full px-3.5 text-footnote font-semibold transition-colors',
        active ? 'bg-label text-bg' : 'bg-surface text-label-secondary shadow-card hover:text-label',
        className,
      )}
      {...props}
    />
  )
}

function ChannelGrid({ children }: { children: React.ReactNode }) {
  return (
    <ul role="list" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {children}
    </ul>
  )
}

function ChannelCard({ channel, index }: { channel: Channel; index: number }) {
  return (
    <li className="animate-rise-in" style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}>
      <Link
        to="/channels/$channelId"
        params={{ channelId: channel.id }}
        className="group flex h-full flex-col rounded-card bg-surface p-4 shadow-card transition-shadow hover:shadow-raised"
      >
        <div className="flex items-center gap-3">
          <ChannelIcon channel={channel} size={44} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-headline text-label group-hover:text-brand-text">
              <span className="truncate">{channel.name}</span>
              {channel.verified && <VerifiedBadge kind="channel" size={15} plain />}
            </p>
            <p className="text-caption-1 text-label-tertiary tabular">{memberLabel(channel.memberCount)}</p>
          </div>
          <JoinButton channel={channel} size="xs" />
        </div>
        <p className="mt-3 line-clamp-2 text-footnote text-label-secondary">{channel.description}</p>
      </Link>
    </li>
  )
}
