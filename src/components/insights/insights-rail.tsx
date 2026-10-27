import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Hash } from 'lucide-react'
import { liveVisitorsQuery, trendingTopicsQuery, visitorSeriesQuery } from '@/lib/queries'
import type { VisitorRange } from '@/lib/types'
import { cn, compactNumber, pluralize } from '@/lib/utils'
import { Card, SectionLabel } from '../ui/card'
import { Skeleton } from '../ui/misc'
import { SegmentedControl } from '../ui/segmented-control'
import { AppwriteIcon } from '../brand-icons'
import { Sparkline } from './sparkline'
import { Link } from '@tanstack/react-router'
import { followedIdsQuery, whoToFollowQuery } from '@/lib/queries'
import { useSession } from '@/lib/session'
import { FollowButton } from '../people/follow-button'
import { Avatar } from '../ui/avatar'

const RANGES: Array<{ value: VisitorRange; label: string; caption: string }> = [
  { value: '24h', label: '24H', caption: 'Last 24 hours' },
  { value: '30d', label: '30D', caption: 'Last 30 days' },
  { value: '1y', label: '1Y', caption: 'Last 12 months' },
]

function formatPointLabel(range: VisitorRange) {
  return (label: string) => {
    const iso = label.includes(' ') ? label.replace(' ', 'T') : label
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return label
    if (range === '24h') return label.slice(11, 16) || label
    if (range === '30d')
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
  }
}

/** "Refetchers online" + visitors chart, powered by Appwrite Analytics (read on the server). */
export function ActivityWidget() {
  const [range, setRange] = React.useState<VisitorRange>('24h')
  const live = useQuery(liveVisitorsQuery())
  const series = useQuery(visitorSeriesQuery(range))

  // Analytics are optional; hide the widget entirely when unavailable.
  if (live.isSuccess && live.data === null && series.isSuccess && series.data === null) return null

  const caption = RANGES.find((r) => r.value === range)?.caption
  return (
    <Card className="p-4">
      {/* Fixed height so the count replacing its skeleton doesn't nudge the card. */}
      <div className="flex h-6 items-center justify-between gap-2.5">
        {live.data == null ? (
          <Skeleton className="h-4 w-36 rounded-full" />
        ) : (
          <p className="animate-fade-in text-subhead text-label-secondary">
            <span className="font-rounded text-headline text-label tabular">{live.data}</span>{' '}
            {live.data === 1 ? 'refetcher' : 'refetchers'} online
          </p>
        )}
        <span aria-hidden className="size-2 shrink-0 animate-live-pulse rounded-full bg-[#30d158]" />
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <SectionLabel className="px-0">Visitors</SectionLabel>
        <span className="text-caption-1 text-label-tertiary">{caption}</span>
      </div>
      {/* Flex, so the skeleton's top margin can't collapse through and shift everything below. */}
      <div className="mt-0.5 flex h-8">
        {series.data ? (
          <p className="animate-fade-in font-rounded text-title-2 text-label tabular">
            {compactNumber(series.data.total)}
          </p>
        ) : (
          <Skeleton className="mt-1 h-6 w-20 rounded-full" />
        )}
      </div>
      <div className="mt-2 h-[72px]">
        {series.data ? (
          <Sparkline points={series.data.points} formatLabel={formatPointLabel(range)} />
        ) : series.isError || series.data === null ? (
          <p className="grid h-full place-items-center text-caption-1 text-label-tertiary">
            Chart unavailable
          </p>
        ) : (
          <Skeleton className="h-full w-full rounded-xl" />
        )}
      </div>
      <SegmentedControl
        aria-label="Visitors time range"
        size="sm"
        className="mt-3"
        value={range}
        onValueChange={setRange}
        options={RANGES.map((r) => ({ value: r.value, label: r.label, ariaLabel: r.caption }))}
      />
    </Card>
  )
}

/** Today's top topics, computed by the `topic-stats` Appwrite Function. */
/** Topics the server returns (getTrendingTopics' default). */
const TRENDING_COUNT = 8

export function TrendingWidget() {
  const { data, isPending } = useQuery(trendingTopicsQuery())
  if (!isPending && (!data || data.length === 0)) return null

  return (
    <Card className="py-3">
      <SectionLabel className="px-4 pb-1">Trending today</SectionLabel>
      {isPending ? (
        // Same rows as the loaded list, so nothing moves when topics arrive.
        <ol className="mt-1" aria-hidden>
          {Array.from({ length: TRENDING_COUNT }, (_, i) => (
            <li key={i} className="flex h-[34px] items-center gap-3 px-4">
              <Skeleton className="h-3 w-4 rounded-full" />
              <Skeleton className="h-3.5 rounded-full" style={{ width: `${45 + ((i * 13) % 35)}%` }} />
              <Skeleton className="ml-auto h-3 w-12 rounded-full" />
            </li>
          ))}
        </ol>
      ) : (
        <ol className="mt-1">
          {data!.map((topic, index) => (
            <li key={topic.key} className="flex h-[34px] items-center gap-3 px-4">
              <span
                className={cn(
                  'w-4 text-right font-rounded text-footnote font-semibold tabular',
                  index < 3 ? 'text-brand-text' : 'text-label-quaternary',
                )}
              >
                {index + 1}
              </span>
              <span className="flex min-w-0 flex-1 items-center gap-1 text-subhead font-medium text-label">
                <Hash className="size-3.5 shrink-0 text-label-tertiary" aria-hidden />
                <span className="truncate">{topic.label}</span>
              </span>
              <span className="shrink-0 text-caption-1 text-label-tertiary tabular">
                {pluralize(topic.articleCount, 'story', 'stories')}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

export function SponsorCard() {
  return (
    <a
      href="https://appwrite.io?ref=refetch.io"
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="group block rounded-card bg-surface p-4 shadow-card transition-shadow hover:shadow-raised"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-[#19191c] text-[#fd366e] shadow-[inset_0_0_0_0.5px_rgb(255_255_255/0.1)]">
          <AppwriteIcon className="h-[18px] w-auto" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-subhead font-semibold text-label">Appwrite Cloud</p>
            <span className="text-caption-2 font-semibold tracking-wider text-label-quaternary uppercase">
              Ad
            </span>
          </div>
          <p className="mt-0.5 text-footnote text-label-secondary">
            The open-source cloud for agents &amp; devs_
          </p>
          <p className="mt-2 inline-flex items-center gap-0.5 text-footnote font-semibold text-brand-text">
            Learn more
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
          </p>
        </div>
      </div>
    </a>
  )
}

/** Right-hand column on wide screens. */
export function InsightsRail({ children }: { children?: React.ReactNode }) {
  return (
    <aside
      aria-label="Insights"
      className="sticky top-[76px] hidden w-[300px] shrink-0 space-y-4 self-start xl:block"
    >
      {children}
      <ActivityWidget />
      <TrendingWidget />
      <WhoToFollow />
      <SponsorCard />
    </aside>
  )
}

/** Suggestions the server returns (getWhoToFollow's default). */
const WHO_TO_FOLLOW_COUNT = 3

/** People to follow, Twitter style; Follow sends visitors to sign in. Hidden once nobody is left to suggest. */
export function WhoToFollow() {
  const { user } = useSession()
  const { data: people, isPending } = useQuery(whoToFollowQuery(user?.id ?? ''))
  const { data: followed } = useQuery({ ...followedIdsQuery(user?.id ?? ''), enabled: Boolean(user) })
  if (isPending) {
    // Same rows as the loaded list, so the cards below don't jump when people arrive.
    return (
      <Card className="py-3" aria-hidden>
        <SectionLabel className="px-4 pb-1">Who to follow</SectionLabel>
        <ul>
          {Array.from({ length: WHO_TO_FOLLOW_COUNT }, (_, i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-2">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              {/* Skeletons sit in real line boxes so each row matches the loaded height exactly. */}
              <span className="min-w-0 flex-1">
                <span className="flex h-[1lh] items-center text-subhead">
                  <Skeleton className="h-3.5 rounded-full" style={{ width: `${50 + ((i * 17) % 30)}%` }} />
                </span>
                <span className="flex h-[1lh] items-center text-caption-1">
                  <Skeleton className="h-3 w-3/4 rounded-full" />
                </span>
              </span>
              <Skeleton className="h-7 w-16 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      </Card>
    )
  }
  if (!people || people.length === 0) return null
  const following = new Set(followed ?? [])

  return (
    <Card className="py-3">
      <SectionLabel className="px-4 pb-1">Who to follow</SectionLabel>
      <ul role="list">
        {people.map((person) => (
          <li key={person.id} className="flex items-center gap-3 px-4 py-2">
            <Link
              to="/u/$userId"
              params={{ userId: person.id }}
              className="group flex min-w-0 flex-1 items-center gap-3"
            >
              <Avatar name={person.name} userId={person.id} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-subhead font-semibold text-label group-hover:text-brand-text">
                  {person.name}
                </span>
                <span className="block truncate text-caption-1 text-label-tertiary">{person.reason}</span>
              </span>
            </Link>
            <FollowButton
              userId={person.id}
              name={person.name}
              following={following.has(person.id)}
              size="xs"
              className="min-w-0"
            />
          </li>
        ))}
      </ul>
    </Card>
  )
}
