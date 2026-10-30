import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowBigUp, Bot, Hash, MessageCircle } from 'lucide-react'
import { communityStatsQuery, configQuery, trafficStatsQuery } from '@/lib/queries'
import { preloadWithin } from '@/lib/preload'
import { median } from '@/lib/site-stats'
import { breadcrumbs, seo } from '@/lib/seo'
import type { CommunityStats, TrafficStats } from '@/lib/types'
import { cn, pluralize } from '@/lib/utils'
import { FeedHeader } from '@/components/feed/feed-view'
import { SiteFooter } from '@/components/layout/footer'
import { ChannelIcon, useChannels } from '@/components/channels/channel-parts'
import { Favicon } from '@/components/favicon'
import { Sparkline } from '@/components/insights/sparkline'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/misc'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  BarList,
  BarListSkeleton,
  ColumnChart,
  CountryFlag,
  MiniStats,
  ShareBar,
  StatTile,
  StatTileSkeleton,
  StatsCard,
  StatsSection,
  WeekHeatmap,
  formatCount,
} from '@/components/stats/stats-parts'

const DESCRIPTION =
  'Refetch in numbers: stories shared, the sites and channels they come from, who reads them and when. Live from our database and Appwrite Analytics.'

/** Longest the first render waits for each half of the page. */
const STATS_WAIT_MS = 1_000

export const Route = createFileRoute('/_app/stats')({
  loader: async ({ context }) => {
    const { queryClient } = context
    const [config] = await Promise.all([
      queryClient.ensureQueryData(configQuery()),
      preloadWithin(queryClient, communityStatsQuery(), STATS_WAIT_MS),
      preloadWithin(queryClient, trafficStatsQuery(), STATS_WAIT_MS),
    ])
    return { siteUrl: config.siteUrl }
  },
  head: ({ loaderData }) => {
    const siteUrl = loaderData?.siteUrl ?? 'https://refetch.io'
    const url = `${siteUrl}/stats`
    return {
      meta: seo({ title: 'Stats: Refetch in numbers | Refetch', description: DESCRIPTION, url }),
      links: [{ rel: 'canonical', href: url }],
      scripts: [
        breadcrumbs([
          { name: 'Refetch', url: `${siteUrl}/` },
          { name: 'Stats', url },
        ]),
      ],
    }
  },
  component: StatsPage,
})

/* ───────────────────────────────── Formatting ──────────────────────────────── */

const monthLabel = (month: string, style: 'short' | 'long' = 'short') =>
  new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    year: style === 'long' ? 'numeric' : '2-digit',
    timeZone: 'UTC',
  })

const dayLabel = (day: string) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })

const percent = (value: number) => `${Math.round(value)}%`

const regionNames = (() => {
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' })
  } catch {
    return null
  }
})()

function countryName(code: string) {
  try {
    return regionNames?.of(code.toUpperCase()) ?? code
  } catch {
    return code
  }
}

/* ─────────────────────────────────── Page ─────────────────────────────────── */

function StatsPage() {
  const community = useQuery(communityStatsQuery())
  const traffic = useQuery(trafficStatsQuery())
  // Analytics are optional: without them the page is the database half alone.
  const hasTraffic = !(traffic.isSuccess && traffic.data === null) && !traffic.isError

  return (
    <div className="mx-auto max-w-5xl">
      <FeedHeader
        title="Stats"
        description="Refetch is open source, and so are its numbers. Everything here comes straight from our database and Appwrite Analytics."
      />

      <div className="space-y-10">
        <Glance community={community.data} traffic={hasTraffic ? traffic.data : null} />

        {community.data ? (
          <Stories stats={community.data} />
        ) : community.isError || community.data === null ? null : (
          <SectionPlaceholder title="Stories" />
        )}

        {hasTraffic &&
          (traffic.data ? <Readers stats={traffic.data} /> : <SectionPlaceholder title="Readers" />)}

        {community.data ? (
          <Community stats={community.data} />
        ) : community.isError || community.data === null ? null : (
          <SectionPlaceholder title="Community" />
        )}

        <p className="px-1 text-caption-1 text-pretty text-label-tertiary">
          Stories count what passes the feeds’ quality checks. Visitor numbers leave out bots and crawlers,
          and times are in UTC. Numbers refresh every 15 to 30 minutes.
        </p>
      </div>

      <SiteFooter variant="page" className="mt-16 lg:hidden" />
    </div>
  )
}

function SectionPlaceholder({ title }: { title: string }) {
  return (
    <section aria-busy className="space-y-3">
      <h2 className="px-1 text-title-3 text-label">{title}</h2>
      <Card className="p-4">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="mt-4 h-[140px] w-full rounded-xl" />
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((i) => (
          <Card key={i} className="p-4">
            <Skeleton className="mb-4 h-3 w-24 rounded-full" />
            <BarListSkeleton rows={5} />
          </Card>
        ))}
      </div>
    </section>
  )
}

/* ──────────────────────────────── At a glance ─────────────────────────────── */

function Glance({
  community,
  traffic,
}: {
  community: CommunityStats | null | undefined
  traffic: TrafficStats | null | undefined
}) {
  const since = community?.since ? monthLabel(community.since.slice(0, 7), 'long') : null
  return (
    <section aria-label="At a glance" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {community ? (
        <>
          <StatTile
            label="Stories shared"
            value={community.stories}
            caption={since ? `Since ${since}` : 'All time'}
          />
          <StatTile label="Sites linked" value={community.recent.siteCount} caption="Last 30 days" />
          <StatTile label="Comments" value={community.comments} caption="All time" />
        </>
      ) : (
        Array.from({ length: 3 }, (_, i) => <StatTileSkeleton key={i} />)
      )}
      {traffic ? (
        <StatTile label="Readers" value={traffic.visitors} caption="Last 30 days" />
      ) : traffic === null ? (
        community && <StatTile label="Members" value={community.members} caption="All time" />
      ) : (
        <StatTileSkeleton />
      )}
    </section>
  )
}

/* ──────────────────────────────────── Stories ─────────────────────────────── */

function Stories({ stats }: { stats: CommunityStats }) {
  const [range, setRange] = React.useState<'months' | 'days'>('months')
  const { byId } = useChannels()
  const { recent } = stats

  const months = stats.months.map((month) => ({ label: month.month, value: month.stories }))
  const days = recent.days.map((day) => ({ label: day.label, value: day.visitors }))
  const points = range === 'months' ? months : days
  const formatLabel = range === 'months' ? (label: string) => monthLabel(label, 'long') : dayLabel
  const axis: [string, string, string] =
    points.length > 0
      ? [
          formatLabel(points[0].label),
          formatLabel(points[Math.floor((points.length - 1) / 2)].label),
          formatLabel(points[points.length - 1].label),
        ]
      : ['', '', '']
  const perDay = recent.stories / Math.max(1, recent.days.length)

  return (
    <StatsSection id="stats-stories" title="Stories" caption="Scout and the community">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-footnote font-medium text-label-secondary">
              {range === 'months' ? 'Stories per month' : 'Stories per day'}
            </p>
            <p className="font-rounded text-title-2 text-label tabular">
              {range === 'months' ? formatCount(stats.stories) : `${formatCount(Math.round(perDay))} a day`}
            </p>
          </div>
          <SegmentedControl
            aria-label="Stories chart range"
            size="sm"
            className="w-48"
            value={range}
            onValueChange={setRange}
            options={[
              { value: 'months', label: 'All time' },
              { value: 'days', label: '30 days' },
            ]}
          />
        </div>
        <div className="mt-4">
          <ColumnChart
            key={range}
            points={points}
            formatLabel={formatLabel}
            describe={(value) => pluralize(value, 'story', 'stories').replace(/^\d+/, formatCount(value))}
            axis={axis}
            height={140}
          />
        </div>
        <MiniStats
          items={[
            { label: 'Last 30 days', value: formatCount(recent.stories) },
            { label: 'Show Refetch', value: formatCount(recent.showStories) },
            { label: 'Feeds read', value: formatCount(stats.feeds) },
            {
              label: 'Average read',
              value: recent.readingTime ? `${recent.readingTime.toFixed(1)} min` : 'n/a',
            },
          ]}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard label="Top sources" caption="Last 30 days">
          <BarList
            unit="stories"
            items={recent.sites.map((site) => ({
              key: site.label,
              label: site.label,
              value: site.count,
              icon: <Favicon domain={site.label} size={16} />,
            }))}
          />
        </StatsCard>
        <StatsCard label="Busiest channels" caption="Last 30 days">
          <BarList
            unit="stories"
            items={recent.channels.map((entry) => {
              const channel = byId.get(entry.label)
              return {
                key: entry.label,
                label: channel?.name ?? entry.label,
                value: entry.count,
                icon: channel ? (
                  <ChannelIcon channel={channel} size={18} />
                ) : (
                  <Hash className="size-4 text-label-tertiary" aria-hidden />
                ),
                wrap: (row) => (
                  <Link
                    to="/channels/$channelId"
                    params={{ channelId: entry.label }}
                    className="block rounded-[8px] hover:bg-fill-secondary"
                  >
                    {row}
                  </Link>
                ),
              }
            })}
          />
        </StatsCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard label="Most covered topics" caption="All time">
          <BarList
            unit="stories"
            items={stats.topics.map((topic) => ({
              key: topic.key,
              label: topic.label,
              value: topic.articleCount,
              icon: <Hash className="size-3.5 text-label-tertiary" aria-hidden />,
              wrap: (row) => (
                <Link
                  to="/topics/$topicKey"
                  params={{ topicKey: topic.key }}
                  className="block rounded-[8px] hover:bg-fill-secondary"
                >
                  {row}
                </Link>
              ),
            }))}
          />
        </StatsCard>
        <div className="space-y-4">
          <StatsCard label="Reading level" caption="Last 30 days">
            <ShareBar
              items={recent.readingLevels.map((level) => ({ label: level.label, value: level.count }))}
            />
          </StatsCard>
          <StatsCard label="Most discussed" caption="All time">
            <StoryList
              stories={stats.mostDiscussed.map((story) => ({
                id: story.id,
                title: story.title,
                meta: pluralize(story.count, 'comment'),
                icon: <MessageCircle className="size-3.5" aria-hidden />,
              }))}
              empty="No conversations yet."
            />
          </StatsCard>
        </div>
      </div>
    </StatsSection>
  )
}

function StoryList({
  stories,
  empty,
}: {
  stories: Array<{ id: string; title: string; meta: string; icon: React.ReactNode }>
  empty: string
}) {
  if (stories.length === 0)
    return <p className="py-4 text-center text-footnote text-label-tertiary">{empty}</p>
  return (
    <ol className="-mx-2">
      {stories.map((story, index) => (
        <li key={story.id}>
          <Link
            to="/threads/$threadId"
            params={{ threadId: story.id }}
            className="group flex items-baseline gap-3 rounded-[10px] px-2 py-1.5 hover:bg-fill-secondary"
          >
            <span
              className={cn(
                'w-4 shrink-0 text-right font-rounded text-footnote font-semibold tabular',
                index < 3 ? 'text-brand-text' : 'text-label-quaternary',
              )}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-subhead font-medium text-label group-hover:text-brand-text">
                {story.title}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-caption-1 text-label-tertiary">
                {story.icon}
                {story.meta}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

/* ──────────────────────────────────── Readers ─────────────────────────────── */

function Readers({ stats }: { stats: TrafficStats }) {
  const minutes = Math.floor(stats.visitDuration / 60)
  const seconds = Math.round(stats.visitDuration % 60)
  const visit = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`

  return (
    <StatsSection id="stats-readers" title="Readers" caption="Last 30 days">
      <Card className="p-4">
        <p className="text-footnote font-medium text-label-secondary">Daily readers</p>
        <p className="font-rounded text-title-2 text-label tabular">
          {formatCount(
            Math.round(median(stats.days.map((day) => day.visitors).filter((count) => count > 0))),
          )}{' '}
          <span className="font-sans text-subhead font-normal text-label-secondary">on a typical day</span>
        </p>
        <div className="mt-10">
          <Sparkline points={stats.days} formatLabel={dayLabel} height={140} />
        </div>
        <MiniStats
          items={[
            { label: 'Pageviews', value: formatCount(stats.pageviews) },
            { label: 'Average visit', value: visit },
            { label: 'Scroll depth', value: percent(stats.scrollDepth) },
            { label: 'Clicks to publishers', value: formatCount(stats.outbound) },
          ]}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard label="When people visit" caption="Last 2 weeks, UTC">
          <WeekHeatmap grid={stats.week} />
        </StatsCard>
        <StatsCard label="Where readers are">
          <BarList
            unit="visitors"
            items={stats.countries.map((country) => ({
              key: country.label,
              label: countryName(country.label),
              value: country.count,
              icon: <CountryFlag code={country.label} />,
            }))}
          />
        </StatsCard>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard label="Devices">
          <ShareBar items={stats.devices.map((device) => ({ label: device.label, value: device.count }))} />
          <div className="mt-5">
            <BarList
              unit="visitors"
              items={stats.systems.map((system) => ({
                key: system.label,
                label: system.label,
                value: system.count,
              }))}
            />
          </div>
        </StatsCard>
        <StatsCard label="Browsers">
          <BarList
            unit="visitors"
            items={stats.browsers.map((browser) => ({
              key: browser.label,
              label: browser.label,
              value: browser.count,
            }))}
          />
        </StatsCard>
        <StatsCard label="Referrers">
          <BarList
            unit="visitors"
            items={stats.referrers.map((referrer) => ({
              key: referrer.label,
              label: referrer.label,
              value: referrer.count,
              icon: referrer.label === 'Direct' ? undefined : <Favicon domain={referrer.label} size={16} />,
            }))}
          />
        </StatsCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StatsCard label="Most read threads">
          <StoryList
            stories={stats.mostRead.map((story) => ({
              id: story.id,
              title: story.title,
              meta: pluralize(story.views, 'reader').replace(/^\d+/, formatCount(story.views)),
              icon: null,
            }))}
            empty="No thread views in the last 30 days yet."
          />
        </StatsCard>
        <StatsCard label="Bots and crawlers">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-brand-tint text-brand-text">
              <Bot className="size-5" aria-hidden />
            </span>
            <p className="text-subhead text-label-secondary">
              <span className="font-rounded text-title-3 text-label tabular">
                {percent(stats.bots.share * 100)}
              </span>{' '}
              of visitors are bots and crawlers. They’re left out of every other number here.
            </p>
          </div>
          <div className="mt-4">
            <BarList
              unit="visitors"
              items={stats.bots.top.map((bot) => ({ key: bot.label, label: bot.label, value: bot.count }))}
            />
          </div>
        </StatsCard>
      </div>
    </StatsSection>
  )
}

/* ─────────────────────────────────── Community ────────────────────────────── */

function Community({ stats }: { stats: CommunityStats }) {
  return (
    <StatsSection id="stats-community" title="Community" caption="All time">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatTile label="Members" value={stats.members} />
          <StatTile label="Votes cast" value={stats.votes} />
          <StatTile label="Follows" value={stats.follows} />
          <StatTile label="Channel joins" value={stats.channelJoins} />
          <StatTile label="Channels" value={stats.channels} />
          <StatTile label="Comments" value={stats.comments} />
        </div>
        <StatsCard label="Most upvoted" caption="All time">
          <StoryList
            stories={stats.mostUpvoted.map((story) => ({
              id: story.id,
              title: story.title,
              meta: pluralize(story.count, 'point'),
              icon: <ArrowBigUp className="size-3.5" aria-hidden />,
            }))}
            empty="No votes yet."
          />
        </StatsCard>
      </div>
    </StatsSection>
  )
}
