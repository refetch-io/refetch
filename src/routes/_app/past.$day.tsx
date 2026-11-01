import type * as React from 'react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, createFileRoute, notFound, useNavigate } from '@tanstack/react-router'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { configQuery, dayFeedQuery } from '@/lib/queries'
import { PAST_START, formatDay, formatShortDay, isPastDay, shiftDay, toDay } from '@/lib/past'
import { SITE_URL, feedHead } from '@/lib/seo'
import { Button } from '@/components/ui/button'
import { Tooltip } from '@/components/ui/tooltip'
import { FeedList, FeedSkeleton } from '@/components/feed/feed-view'
import { FeedTabs } from '@/components/feed/feed-column'
import { FeedLayout, feedSearchSchema } from '@/components/feed/feed-layout'

const TITLE = 'Past'

export const Route = createFileRoute('/_app/past/$day')({
  validateSearch: feedSearchSchema,
  beforeLoad: ({ params }) => {
    if (!isPastDay(params.day)) throw notFound()
  },
  loaderDeps: ({ search }) => ({ page: search.page ?? 1 }),
  loader: async ({ context, params, deps }) => {
    const [feed, config] = await Promise.all([
      context.queryClient.ensureQueryData(dayFeedQuery(params.day, deps.page, context.user?.id ?? null)),
      context.queryClient.ensureQueryData(configQuery()),
    ])
    return {
      siteUrl: config.siteUrl,
      page: deps.page,
      stories: feed.posts.map((post) => ({ id: post.id, title: post.title })),
    }
  },
  head: ({ loaderData, params }) => {
    const date = formatDay(params.day, false)
    return feedHead({
      siteUrl: loaderData?.siteUrl ?? SITE_URL,
      path: `/past/${params.day}`,
      page: loaderData?.page ?? 1,
      title: `Top tech stories of ${date} | Refetch`,
      description: `The front page of Refetch on ${date}: the day's most upvoted tech news and discussions.`,
      name: `Top stories of ${date}`,
      stories: loaderData?.stories ?? [],
      // Days nobody posted on are thin pages.
      noindex: loaderData?.stories.length === 0,
    })
  },
  pendingComponent: () => (
    <FeedLayout column={<FeedTabs title={TITLE} />}>
      <div className="h-[57px] border-b border-separator" />
      <FeedSkeleton ranked />
    </FeedLayout>
  ),
  component: PastPage,
})

function PastPage() {
  const { day } = Route.useParams()
  const { page } = Route.useLoaderDeps()
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()
  const { data } = useSuspenseQuery(dayFeedQuery(day, page, user?.id ?? null))
  const today = toDay(Date.now())
  const previous = shiftDay(day, -1)
  const next = shiftDay(day, 1)

  return (
    <FeedLayout column={<FeedTabs title={`${TITLE}: ${formatDay(day)}`} />} feed={data}>
      <nav
        aria-label="Days"
        className="flex items-center gap-2 border-b border-separator px-2 py-2.5 sm:px-3"
      >
        <DayLink day={previous} disabled={previous < PAST_START} label="Previous day">
          <ChevronLeft />
        </DayLink>
        <div className="min-w-0 flex-1 text-center">
          <h2 className="truncate text-headline text-label">
            <span className="max-sm:hidden">{formatDay(day)}</span>
            <span className="sm:hidden">{formatShortDay(day)}</span>
          </h2>
          <p className="text-caption-1 text-label-tertiary">The day’s most upvoted stories, UTC</p>
        </div>
        <Tooltip content="Pick a day">
          <label className="relative grid size-8 cursor-pointer place-items-center rounded-full text-label-secondary transition-colors focus-within:ring-2 focus-within:ring-brand/40 hover:bg-fill-secondary hover:text-label">
            <CalendarDays className="size-4" aria-hidden />
            <span className="sr-only">Pick a day</span>
            <input
              type="date"
              value={day}
              min={PAST_START}
              max={today}
              onChange={(event) => {
                const picked = event.target.value
                if (isPastDay(picked)) void navigate({ to: '/past/$day', params: { day: picked } })
              }}
              className="absolute inset-0 cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
          </label>
        </Tooltip>
        <DayLink day={next} disabled={next > today} label="Next day">
          <ChevronRight />
        </DayLink>
      </nav>
      <FeedList
        page={data}
        ranked
        empty={{
          title: 'Nothing that day',
          description: 'No stories made the cut on this day. Try another one.',
          action: (
            <Button asChild variant="primary" size="md">
              <Link to="/">Today’s top stories</Link>
            </Button>
          ),
        }}
      />
    </FeedLayout>
  )
}

function DayLink({
  day,
  disabled,
  label,
  children,
}: {
  day: string
  disabled: boolean
  label: string
  children: React.ReactNode
}) {
  if (disabled) {
    return (
      <Button variant="ghost" size="icon-sm" disabled aria-label={label}>
        {children}
      </Button>
    )
  }
  return (
    <Tooltip content={formatDay(day)}>
      <Button asChild variant="ghost" size="icon-sm">
        <Link to="/past/$day" params={{ day }} aria-label={`${label}: ${formatDay(day)}`}>
          {children}
        </Link>
      </Button>
    </Tooltip>
  )
}
