import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart } from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { useOnlinePresences } from '@/hooks/use-online-presences'
import { useAuth } from '@/contexts/auth-context'
import { getInitialsAvatarUrl } from '@/lib/appwrite-web'
import {
  PRESENCE_STATUS_DOT,
  getPresenceSharingEnabled,
  persistPresenceSharing,
} from '@/lib/presence'
import { PresenceVisibilityToggle } from '@/components/presence-visibility-toggle'
import { cn, getInitials } from '@/lib/utils'
import { toast } from 'sonner'

type ChartTab = '24h' | '30d' | '1y'

type ChartPoint = {
  label: string
  visitors: number
}

type ChartSeries = Record<ChartTab, ChartPoint[]>

const TRENDING_TOPICS = [
  'AI',
  'DataScience',
  'OpenSource',
  'DevOps',
  'MachineLearning',
] as const

const PERIODS = [
  { value: '24h' as const, label: '24h', description: 'Last 24 hours' },
  { value: '30d' as const, label: '30d', description: 'Last 30 days' },
  { value: '1y' as const, label: '1y', description: 'Last 12 months' },
]

const chartConfig = {
  visitors: {
    label: 'Visitors',
    color: 'var(--brand)',
  },
} satisfies ChartConfig

/**
 * Fixed geometry for the online section — every loading/loaded state must
 * fit these boxes so the rail never jumps when presence/auth resolves.
 */
const PRESENCE_LIST_CLASS = 'h-44 shrink-0'
const PRESENCE_ROW_CLASS = 'flex h-14 items-center gap-2.5'
const PRESENCE_HEADER_CLASS = 'flex h-[3.375rem] shrink-0 flex-col justify-center gap-1.5'
const PRESENCE_TOGGLE_CLASS = 'flex h-12 shrink-0 items-end border-t border-border/50'

const EMPTY_SERIES: ChartSeries = {
  '24h': [],
  '30d': [],
  '1y': [],
}

let analyticsCache: ChartSeries | null = null
let analyticsPromise: Promise<ChartSeries> | null = null

function formatCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

function PresenceListSkeleton() {
  return (
    <div className="flex flex-col divide-y divide-border/40" aria-hidden>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className={PRESENCE_ROW_CLASS}>
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <Skeleton className="h-3.5 w-[58%] rounded-sm" />
            <Skeleton className="h-3 w-[42%] rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  )
}

function PresenceEmptyState({
  isAuthenticated,
}: {
  isAuthenticated: boolean
}) {
  return (
    <div className="flex h-full flex-col justify-center gap-2">
      <div className="flex -space-x-2" aria-hidden>
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="size-6 rounded-full border-2 border-background bg-muted"
            style={{ zIndex: 3 - index }}
          />
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {isAuthenticated
          ? 'No other refetchers online right now.'
          : 'No signed-in refetchers yet. Sign in to appear here.'}
      </p>
    </div>
  )
}

async function fetchAnalytics<T>(type: string): Promise<T> {
  const response = await fetch(`/api/v1/analytics?type=${type}`)
  const payload = await response.json()
  if (!response.ok || payload.error) {
    throw new Error(payload.error || 'Failed to fetch analytics')
  }
  return payload.data as T
}

function loadAnalyticsSeries(): Promise<ChartSeries> {
  if (analyticsCache) return Promise.resolve(analyticsCache)
  if (analyticsPromise) return analyticsPromise

  analyticsPromise = (async () => {
    const [data24h, data30d, data1y] = await Promise.all([
      fetchAnalytics<Array<{ hour?: number; visitors: number }>>('24h'),
      fetchAnalytics<Array<{ day?: number; visitors: number }>>('30d'),
      fetchAnalytics<Array<{ month?: string; visitors: number }>>('1y'),
    ])

    const next: ChartSeries = {
      '24h': (Array.isArray(data24h) ? data24h : []).map((d, i) => ({
        label:
          d.hour !== undefined
            ? `${String(d.hour).padStart(2, '0')}:00`
            : `H${i + 1}`,
        visitors: d.visitors ?? 0,
      })),
      '30d': (Array.isArray(data30d) ? data30d : []).map((d, i) => ({
        label: d.day !== undefined ? `Day ${d.day}` : `D${i + 1}`,
        visitors: d.visitors ?? 0,
      })),
      '1y': (Array.isArray(data1y) ? data1y : []).map((d, i) => ({
        label: d.month ?? `M${i + 1}`,
        visitors: d.visitors ?? 0,
      })),
    }
    analyticsCache = next
    return next
  })().finally(() => {
    analyticsPromise = null
  })

  return analyticsPromise
}

function LiveViewSection() {
  const { isAuthenticated, loading: authLoading, user, refreshUser } =
    useAuth()
  const { users, count, loading, error, statusLabel, statusTone } =
    useOnlinePresences()
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false,
  )
  const [sharePresence, setSharePresence] = useState(true)
  const [savingPresence, setSavingPresence] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const sync = () => setIsDark(root.classList.contains('dark'))
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (user) setSharePresence(getPresenceSharingEnabled(user.prefs))
  }, [user])

  const togglePresenceSharing = async (enabled: boolean) => {
    const previous = sharePresence
    setSharePresence(enabled)
    setSavingPresence(true)
    try {
      await persistPresenceSharing(enabled)
      await refreshUser()
      toast.success(
        enabled ? 'You’re visible as online' : 'Your presence is hidden',
      )
    } catch (err) {
      setSharePresence(previous)
      toast.error(
        err instanceof Error
          ? err.message
          : 'Could not update presence setting',
      )
    } finally {
      setSavingPresence(false)
    }
  }

  const authReady = !authLoading
  const showSkeleton = loading && users.length === 0
  const showToggle = authReady && isAuthenticated
  const displayCount = error && count === 0 ? '-' : count
  const countLabel = count === 1 ? 'refetcher online' : 'refetchers online'
  const statusLine =
    error && count === 0
      ? 'Presence offline'
      : !authReady || !isAuthenticated || sharePresence
        ? 'Live · Presence'
        : 'Live · You’re hidden'

  return (
    <section className="flex h-[19.375rem] flex-col gap-4 overflow-hidden">
      <div className={PRESENCE_HEADER_CLASS}>
        <div className="flex h-8 items-center gap-1.5 overflow-hidden">
          {showSkeleton ? (
            <>
              <Skeleton className="h-7 w-9 shrink-0 rounded-md" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </>
          ) : (
            <>
              <p className="min-w-[1.25em] font-heading text-2xl leading-8 font-semibold tracking-tight tabular-nums">
                {displayCount}
              </p>
              <span className="truncate text-sm leading-none text-muted-foreground">
                {countLabel}
              </span>
            </>
          )}
        </div>
        <p className="flex h-4 items-center overflow-hidden text-xs leading-none text-muted-foreground">
          {showSkeleton ? (
            <Skeleton className="h-3 w-24 rounded-md" />
          ) : (
            statusLine
          )}
        </p>
      </div>

      <div className={cn('relative overflow-hidden', PRESENCE_LIST_CLASS)}>
        {showSkeleton ? (
          <PresenceListSkeleton />
        ) : users.length > 0 ? (
          <ul className="flex h-full flex-col divide-y divide-border/40 overflow-y-auto overscroll-contain">
            {users.map((presenceUser) => {
              const tone = statusTone(presenceUser.status)
              return (
                <li key={presenceUser.userId} className="shrink-0">
                  <div className={PRESENCE_ROW_CLASS}>
                    <div className="relative size-6 shrink-0">
                      <Avatar size="sm">
                        <AvatarImage
                          src={getInitialsAvatarUrl(
                            presenceUser.name,
                            64,
                            isDark ? 'ffffff' : '000000',
                          )}
                          alt=""
                        />
                        <AvatarFallback
                          delayMs={0}
                          className="bg-foreground text-[10px] text-background"
                        >
                          {getInitials(presenceUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        aria-hidden
                        className={cn(
                          'absolute right-0 bottom-0 size-2 rounded-full ring-2 ring-background transition-colors duration-300',
                          PRESENCE_STATUS_DOT[tone],
                        )}
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                      <p className="truncate text-sm leading-none font-medium">
                        {presenceUser.name}
                      </p>
                      <p className="truncate text-xs leading-none text-muted-foreground transition-[color] duration-300">
                        {statusLabel(presenceUser.status, {
                          page: presenceUser.page,
                          activity: presenceUser.activity,
                          name: presenceUser.name,
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <PresenceEmptyState isAuthenticated={authReady && isAuthenticated} />
        )}
      </div>

      {/* Always reserve toggle height so auth resolve doesn’t shove sections down. */}
      <div
        className={cn(
          PRESENCE_TOGGLE_CLASS,
          !showToggle && 'invisible pointer-events-none',
        )}
        aria-hidden={!showToggle}
      >
        <PresenceVisibilityToggle
          enabled={sharePresence}
          disabled={!showToggle || savingPresence}
          onChange={togglePresenceSharing}
        />
      </div>
    </section>
  )
}

function ChartPlaceholder({
  animated = false,
}: {
  animated?: boolean
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative size-full overflow-hidden',
        animated && 'motion-safe:animate-pulse',
      )}
    >
      <svg
        viewBox="0 0 240 64"
        className="absolute inset-0 size-full text-muted-foreground/30"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="chartPlaceholderFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="currentColor" stopOpacity="0.4" />
            <stop offset="95%" stopColor="currentColor" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path
          d="M0 48 C40 44 50 20 80 28 C110 36 120 12 150 22 C180 32 200 40 240 18 V64 H0 Z"
          fill="url(#chartPlaceholderFill)"
        />
        <path
          d="M0 48 C40 44 50 20 80 28 C110 36 120 12 150 22 C180 32 200 40 240 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-muted-foreground/45"
        />
      </svg>
    </div>
  )
}

function VisitorsChartSection() {
  const [tab, setTab] = useState<ChartTab>('24h')
  const [series, setSeries] = useState<ChartSeries>(
    () => analyticsCache ?? EMPTY_SERIES,
  )
  const [loading, setLoading] = useState(() => !analyticsCache)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (!analyticsCache) setLoading(true)
      try {
        const next = await loadAnalyticsSeries()
        if (cancelled) return
        setSeries(next)
        setError(false)
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const totals = useMemo(
    () => ({
      '24h': series['24h'].reduce((sum, d) => sum + d.visitors, 0),
      '30d': series['30d'].reduce((sum, d) => sum + d.visitors, 0),
      '1y': series['1y'].reduce((sum, d) => sum + d.visitors, 0),
    }),
    [series],
  )

  const activeData = series[tab]
  const periodLabel =
    PERIODS.find((period) => period.value === tab)?.description ?? 'Visitors'
  const showChart = !loading && !error && activeData.length > 0

  return (
    <section className="flex flex-col gap-3">
      <p className="flex h-4 items-center text-xs text-muted-foreground">
        {periodLabel}
      </p>

      <div className="relative h-16 w-full overflow-hidden">
        {!showChart ? (
          <ChartPlaceholder animated={loading} />
        ) : null}
        {showChart ? (
          <ChartContainer
            config={chartConfig}
            className="absolute inset-0 aspect-auto! h-16 w-full"
            initialDimension={{ width: 240, height: 64 }}
          >
            <AreaChart
              data={activeData}
              margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="fillVisitors" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-visitors)"
                    stopOpacity={0.35}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-visitors)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel indicator="line" />}
              />
              <Area
                dataKey="visitors"
                type="monotone"
                fill="url(#fillVisitors)"
                stroke="var(--color-visitors)"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </AreaChart>
          </ChartContainer>
        ) : null}
      </div>

      <div className="flex flex-col">
        {PERIODS.map((period, index) => {
          const active = tab === period.value
          return (
            <div key={period.value}>
              <button
                type="button"
                onClick={() => setTab(period.value)}
                disabled={loading}
                className={cn(
                  'flex h-9 w-full items-center justify-between gap-3 text-left text-sm transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                  loading && 'pointer-events-none',
                )}
              >
                <span>{period.label}</span>
                <span className="inline-flex h-4 min-w-[2.75rem] items-center justify-end">
                  {loading ? (
                    <Skeleton className="h-3.5 w-8 rounded-sm" />
                  ) : (
                    <span
                      className={cn(
                        'tabular-nums',
                        active
                          ? 'font-semibold text-foreground'
                          : 'font-medium',
                      )}
                    >
                      {error ? '-' : formatCount(totals[period.value])}
                    </span>
                  )}
                </span>
              </button>
              {index < PERIODS.length - 1 ? <Separator /> : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function TrendingTopicsSection() {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        Trending now
      </h3>
      <ul className="flex flex-col">
        {TRENDING_TOPICS.map((topic, index) => (
          <li key={topic}>
            <p className="py-2 text-sm text-foreground/90">#{topic}</p>
            {index < TRENDING_TOPICS.length - 1 ? <Separator /> : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SponsoredSection() {
  return (
    <a
      href="https://appwrite.io?ref=refetch.io"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <img
          src="https://appwrite.io/images/logos/logo.svg"
          alt=""
          width={18}
          height={18}
          className="size-4"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <p className="text-sm font-medium">Appwrite Cloud</p>
          <span className="text-xs text-muted-foreground">Ad</span>
        </div>
        <p className="text-xs leading-snug text-muted-foreground">
          Build faster with our fully managed backend platform.
        </p>
        <p className="mt-2 text-xs font-medium text-primary">Learn more →</p>
      </div>
    </a>
  )
}

export function FeedRightSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn('flex w-full flex-col gap-8', className)}>
      <LiveViewSection />
      <Separator />
      <VisitorsChartSection />
      <Separator />
      <TrendingTopicsSection />
      <Separator />
      <SponsoredSection />
    </aside>
  )
}
